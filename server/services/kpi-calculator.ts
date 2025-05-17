/**
 * KPI Calculator Service
 * 
 * This service calculates and caches key performance indicators from all data sources:
 * - Close CRM (contacts, activities, deals)
 * - Calendly (meetings)
 * - Typeform (form submissions)
 * 
 * It provides the core metrics used by the dashboards and reports.
 */

import { storage } from '../storage';
import { formatISO, subDays, startOfDay, endOfDay, parseISO, format } from 'date-fns';
import { metrics, InsertMetrics } from '@shared/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { db } from '../db';

/**
 * Calculate and save metrics for a specific date
 * @param date The date to calculate metrics for
 * @param userId Optional user ID to filter metrics by
 */
export async function calculateMetricsForDate(date: Date, userId?: string): Promise<any> {
  console.log(`Calculating metrics for date: ${date.toISOString()}, userId: ${userId || 'all'}`);
  
  // Format date for consistent querying
  const dateStr = format(date, 'yyyy-MM-dd');
  const startDate = formatISO(startOfDay(parseISO(dateStr)));
  const endDate = formatISO(endOfDay(parseISO(dateStr)));
  
  // Create metrics object
  const newMetrics: Partial<InsertMetrics> = {
    date: date,
    userId: userId,
    dateRange: `${dateStr}_${dateStr}`,
  };
  
  try {
    // Get all data for date range
    let contactsQuery = `
      SELECT * FROM contacts 
      WHERE created_at::date = '${dateStr}'::date
    `;
    
    let activitiesQuery = `
      SELECT * FROM activities 
      WHERE date::date = '${dateStr}'::date
    `;
    
    let dealsQuery = `
      SELECT * FROM deals 
      WHERE created_at::date = '${dateStr}'::date
      OR close_date::date = '${dateStr}'::date
    `;
    
    let meetingsQuery = `
      SELECT * FROM meetings 
      WHERE start_time::date = '${dateStr}'::date
      OR booked_at::date = '${dateStr}'::date
    `;
    
    let formsQuery = `
      SELECT * FROM forms 
      WHERE submitted_at::date = '${dateStr}'::date
    `;
    
    // Add user filter if specified
    if (userId) {
      contactsQuery += ` AND assigned_to = '${userId}'`;
      // For activities, deals, and meetings, join to contacts table to filter by user
      activitiesQuery = `
        SELECT a.* FROM activities a
        JOIN contacts c ON a.contact_id = c.id
        WHERE a.date::date = '${dateStr}'::date
        AND c.assigned_to = '${userId}'
      `;
      
      dealsQuery = `
        SELECT d.* FROM deals d
        JOIN contacts c ON d.contact_id = c.id
        WHERE (d.created_at::date = '${dateStr}'::date OR d.close_date::date = '${dateStr}'::date)
        AND (d.assigned_to = '${userId}' OR c.assigned_to = '${userId}')
      `;
      
      meetingsQuery = `
        SELECT m.* FROM meetings m
        JOIN contacts c ON m.contact_id = c.id
        WHERE (m.start_time::date = '${dateStr}'::date OR m.booked_at::date = '${dateStr}'::date)
        AND (m.assigned_to = '${userId}' OR c.assigned_to = '${userId}')
      `;
      
      formsQuery = `
        SELECT f.* FROM forms f
        JOIN contacts c ON f.contact_id = c.id
        WHERE f.submitted_at::date = '${dateStr}'::date
        AND c.assigned_to = '${userId}'
      `;
    }
    
    // Execute queries
    const contacts = await storage.query(contactsQuery);
    const activities = await storage.query(activitiesQuery);
    const deals = await storage.query(dealsQuery);
    const meetings = await storage.query(meetingsQuery);
    const forms = await storage.query(formsQuery);
    
    // Calculate Sales Performance Metrics
    const wonDeals = deals.filter(d => d.status === 'won');
    const lostDeals = deals.filter(d => d.status === 'lost');
    const openDeals = deals.filter(d => d.status === 'open');
    
    newMetrics.closedDeals = wonDeals.length + lostDeals.length;
    newMetrics.wonDeals = wonDeals.length;
    newMetrics.lostDeals = lostDeals.length;
    newMetrics.openDeals = openDeals.length;
    
    // Calculate total cash collected and contracted value
    let totalCashCollected = 0;
    let totalContractedValue = 0;
    
    wonDeals.forEach(deal => {
      // Parse numeric values from text fields
      const cashCollected = parseFloat(deal.cash_collected?.replace(/[^0-9.-]+/g, '') || '0');
      const contractedValue = parseFloat(deal.contracted_value?.replace(/[^0-9.-]+/g, '') || '0');
      
      if (!isNaN(cashCollected)) {
        totalCashCollected += cashCollected;
      }
      
      if (!isNaN(contractedValue)) {
        totalContractedValue += contractedValue;
      }
    });
    
    newMetrics.cashCollected = totalCashCollected.toString();
    newMetrics.contractedValue = totalContractedValue.toString();
    newMetrics.revenueGenerated = totalCashCollected.toString(); // Could be different calculation
    
    // Calculate Call Metrics
    const calls = activities.filter(a => a.type === 'call');
    newMetrics.totalCalls = calls.length;
    
    // Categorize meetings by sequence
    const nc1Meetings = meetings.filter(m => m.sequence === 1);
    const c2Meetings = meetings.filter(m => m.sequence === 2);
    
    newMetrics.call1Taken = nc1Meetings.length;
    newMetrics.call2Taken = c2Meetings.length;
    
    // Calculate calls to close ratio
    newMetrics.callsToClose = newMetrics.wonDeals > 0 ? 
      (newMetrics.totalCalls / newMetrics.wonDeals).toString() : 
      '0';
    
    // Track call outcomes
    const answeredCalls = calls.filter(c => c.call_outcome === 'answered');
    const unansweredCalls = calls.filter(c => c.call_outcome !== 'answered');
    
    newMetrics.callsAnswered = answeredCalls.length;
    newMetrics.callsUnanswered = unansweredCalls.length;
    
    // Calculate Meeting Metrics
    newMetrics.totalMeetings = meetings.length;
    newMetrics.meetingsAttended = meetings.filter(m => m.status === 'completed').length;
    newMetrics.meetingsCanceled = meetings.filter(m => m.status === 'canceled').length;
    newMetrics.meetingsRescheduled = meetings.filter(m => m.rescheduled).length;
    
    // Calculate Form Metrics
    newMetrics.totalForms = forms.length;
    newMetrics.formsCompleted = forms.filter(f => f.completion_percentage === 100).length;
    
    // Calculate form conversion rate
    const formConversionRate = newMetrics.totalForms > 0 ? 
      (newMetrics.formsCompleted / newMetrics.totalForms) : 
      0;
    newMetrics.formConversionRate = formConversionRate.toString();
    
    // Calculate Efficiency Metrics
    // Closing rate: won deals / total closed deals
    const closingRate = newMetrics.closedDeals > 0 ? 
      (newMetrics.wonDeals / newMetrics.closedDeals) : 
      0;
    newMetrics.closingRate = closingRate.toString();
    
    // Average cash collected per won deal
    const avgCashCollected = newMetrics.wonDeals > 0 ? 
      (totalCashCollected / newMetrics.wonDeals) : 
      0;
    newMetrics.avgCashCollected = avgCashCollected.toString();
    
    // Average deal size
    const avgDealSize = newMetrics.wonDeals > 0 ? 
      (totalContractedValue / newMetrics.wonDeals) : 
      0;
    newMetrics.avgDealSize = avgDealSize.toString();
    
    // Solution call show rate
    const solutionCalls = meetings.filter(m => m.type === 'solution_call');
    const solutionCallShowRate = solutionCalls.length > 0 ? 
      (solutionCalls.filter(m => m.status === 'completed').length / solutionCalls.length) : 
      0;
    newMetrics.solutionCallShowRate = solutionCallShowRate.toString();
    
    // Earnings per call2
    const earningPerCall2 = c2Meetings.length > 0 ? 
      (totalCashCollected / c2Meetings.length) : 
      0;
    newMetrics.earningPerCall2 = earningPerCall2.toString();
    
    // Calculate average sales cycle in days
    // This requires looking at historical data for the deals that closed on this date
    let totalSalesCycleDays = 0;
    let salesCycleDealsCount = 0;
    
    for (const deal of wonDeals) {
      // Use the deal's history or related contact to determine first touch date
      const contact = await storage.getContact(deal.contactId);
      if (contact && contact.firstTouchDate) {
        const firstTouchDate = new Date(contact.firstTouchDate);
        const closeDate = new Date(deal.closeDate);
        const cycleDays = Math.floor((closeDate.getTime() - firstTouchDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (cycleDays >= 0) {
          totalSalesCycleDays += cycleDays;
          salesCycleDealsCount++;
        }
      }
    }
    
    newMetrics.salesCycleDays = salesCycleDealsCount > 0 ? 
      Math.floor(totalSalesCycleDays / salesCycleDealsCount) : 
      0;
    
    // Calculate Attribution Metrics
    
    // Get total contacts that should have attribution
    const totalContactsCount = await storage.getContactsCount();
    
    // Count contacts with multiple sources
    const multiSourceQuery = `
      SELECT COUNT(*) as count FROM contacts 
      WHERE sources_count > 1
    `;
    const multiSourceResult = await storage.query(multiSourceQuery);
    const contactsWithMultipleSources = multiSourceResult[0]?.count || 0;
    
    // Calculate multi-source rate
    const multiSourceRate = totalContactsCount > 0 ? 
      (contactsWithMultipleSources / totalContactsCount) : 
      0;
    
    newMetrics.multiSourceRate = multiSourceRate.toString();
    newMetrics.contactsWithMultipleSources = contactsWithMultipleSources;
    
    // Calculate average field coverage
    const fieldCoverageQuery = `
      SELECT AVG(fieldcoverage) as avg_coverage FROM contacts
    `;
    const fieldCoverageResult = await storage.query(fieldCoverageQuery);
    newMetrics.fieldCoverage = Math.floor(fieldCoverageResult[0]?.avg_coverage || 0);
    
    // Calculate attribution accuracy
    // This is a more complex calculation that would require verifying data against source systems
    // For now, use a simplified calculation based on field coverage
    newMetrics.attributionAccuracy = newMetrics.fieldCoverage;
    
    // Calculate Lead Metrics
    newMetrics.newLeads = contacts.length;
    newMetrics.qualifiedLeads = contacts.filter(c => c.qualificationStatus === 'qualified').length;
    newMetrics.disqualifiedLeads = contacts.filter(c => c.qualificationStatus === 'disqualified').length;
    
    // Calculate source distribution
    const sourceQuery = `
      SELECT lead_source, COUNT(*) as count 
      FROM contacts 
      GROUP BY lead_source
    `;
    const sourceDistribution = await storage.query(sourceQuery);
    newMetrics.sourceDistribution = {};
    
    sourceDistribution.forEach(src => {
      newMetrics.sourceDistribution[src.lead_source] = src.count;
    });
    
    // Save metrics to database
    // First check if metrics already exist for this date + user combo
    const existingMetrics = await storage.getMetricsByDate(dateStr, userId);
    
    if (existingMetrics) {
      // Update existing metrics
      await storage.updateMetrics(existingMetrics.id, newMetrics);
      console.log(`Updated metrics for date ${dateStr}, userId: ${userId || 'all'}`);
      return { ...existingMetrics, ...newMetrics };
    } else {
      // Create new metrics
      const savedMetrics = await storage.createMetrics(newMetrics as InsertMetrics);
      console.log(`Created new metrics for date ${dateStr}, userId: ${userId || 'all'}`);
      return savedMetrics;
    }
  } catch (error) {
    console.error(`Error calculating metrics for date ${dateStr}:`, error);
    throw error;
  }
}

/**
 * Calculate metrics for a date range
 * @param startDate Start date of the range
 * @param endDate End date of the range
 * @param userId Optional user ID to filter metrics by
 */
export async function calculateMetricsForDateRange(startDate: Date, endDate: Date, userId?: string): Promise<any> {
  console.log(`Calculating metrics for date range: ${startDate.toISOString()} to ${endDate.toISOString()}, userId: ${userId || 'all'}`);
  
  // Format dates for database
  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');
  
  // Create metrics object for the range
  const rangeMetrics: Partial<InsertMetrics> = {
    date: startDate, // Use start date as reference
    userId: userId,
    dateRange: `${startDateStr}_${endDateStr}`,
  };
  
  try {
    // Similar to calculateMetricsForDate but with date range queries
    let contactsQuery = `
      SELECT * FROM contacts 
      WHERE created_at::date BETWEEN '${startDateStr}'::date AND '${endDateStr}'::date
    `;
    
    let activitiesQuery = `
      SELECT * FROM activities 
      WHERE date::date BETWEEN '${startDateStr}'::date AND '${endDateStr}'::date
    `;
    
    let dealsQuery = `
      SELECT * FROM deals 
      WHERE (created_at::date BETWEEN '${startDateStr}'::date AND '${endDateStr}'::date)
      OR (close_date::date BETWEEN '${startDateStr}'::date AND '${endDateStr}'::date)
    `;
    
    let meetingsQuery = `
      SELECT * FROM meetings 
      WHERE (start_time::date BETWEEN '${startDateStr}'::date AND '${endDateStr}'::date)
      OR (booked_at::date BETWEEN '${startDateStr}'::date AND '${endDateStr}'::date)
    `;
    
    let formsQuery = `
      SELECT * FROM forms 
      WHERE submitted_at::date BETWEEN '${startDateStr}'::date AND '${endDateStr}'::date
    `;
    
    // Add user filter if specified (same as single date method)
    if (userId) {
      contactsQuery += ` AND assigned_to = '${userId}'`;
      
      activitiesQuery = `
        SELECT a.* FROM activities a
        JOIN contacts c ON a.contact_id = c.id
        WHERE a.date::date BETWEEN '${startDateStr}'::date AND '${endDateStr}'::date
        AND c.assigned_to = '${userId}'
      `;
      
      dealsQuery = `
        SELECT d.* FROM deals d
        JOIN contacts c ON d.contact_id = c.id
        WHERE ((d.created_at::date BETWEEN '${startDateStr}'::date AND '${endDateStr}'::date)
        OR (d.close_date::date BETWEEN '${startDateStr}'::date AND '${endDateStr}'::date))
        AND (d.assigned_to = '${userId}' OR c.assigned_to = '${userId}')
      `;
      
      meetingsQuery = `
        SELECT m.* FROM meetings m
        JOIN contacts c ON m.contact_id = c.id
        WHERE ((m.start_time::date BETWEEN '${startDateStr}'::date AND '${endDateStr}'::date)
        OR (m.booked_at::date BETWEEN '${startDateStr}'::date AND '${endDateStr}'::date))
        AND (m.assigned_to = '${userId}' OR c.assigned_to = '${userId}')
      `;
      
      formsQuery = `
        SELECT f.* FROM forms f
        JOIN contacts c ON f.contact_id = c.id
        WHERE f.submitted_at::date BETWEEN '${startDateStr}'::date AND '${endDateStr}'::date
        AND c.assigned_to = '${userId}'
      `;
    }
    
    // Execute queries
    const contacts = await storage.query(contactsQuery);
    const activities = await storage.query(activitiesQuery);
    const deals = await storage.query(dealsQuery);
    const meetings = await storage.query(meetingsQuery);
    const forms = await storage.query(formsQuery);
    
    // Calculate metrics just like the single day method
    // ...
    
    // Implement the same calculations as in calculateMetricsForDate
    // but for the date range data
    
    // Example: calculate sales metrics
    const wonDeals = deals.filter(d => d.status === 'won');
    const lostDeals = deals.filter(d => d.status === 'lost');
    const openDeals = deals.filter(d => d.status === 'open');
    
    rangeMetrics.closedDeals = wonDeals.length + lostDeals.length;
    rangeMetrics.wonDeals = wonDeals.length;
    rangeMetrics.lostDeals = lostDeals.length;
    rangeMetrics.openDeals = openDeals.length;
    
    // ... copy all other calculations from single day method
    
    // Check if metrics already exist for this date range + user combo
    const existingRangeMetrics = await db
      .select()
      .from(metrics)
      .where(
        and(
          eq(metrics.dateRange, `${startDateStr}_${endDateStr}`),
          userId ? eq(metrics.userId, userId) : sql`1=1`
        )
      )
      .limit(1);
    
    if (existingRangeMetrics.length > 0) {
      // Update existing range metrics
      await storage.updateMetrics(existingRangeMetrics[0].id, rangeMetrics);
      console.log(`Updated metrics for date range ${startDateStr} to ${endDateStr}, userId: ${userId || 'all'}`);
      return { ...existingRangeMetrics[0], ...rangeMetrics };
    } else {
      // Create new range metrics
      const savedRangeMetrics = await storage.createMetrics(rangeMetrics as InsertMetrics);
      console.log(`Created new metrics for date range ${startDateStr} to ${endDateStr}, userId: ${userId || 'all'}`);
      return savedRangeMetrics;
    }
  } catch (error) {
    console.error(`Error calculating metrics for date range ${startDateStr} to ${endDateStr}:`, error);
    throw error;
  }
}

/**
 * Recalculate all metrics for the past N days
 * @param days Number of days to go back
 * @param userIds Optional array of user IDs to calculate metrics for
 */
export async function recalculateRecentMetrics(days: number = 30, userIds?: string[]): Promise<void> {
  console.log(`Recalculating metrics for the past ${days} days`);
  
  // Get current date
  const today = new Date();
  
  // Calculate metrics for each day
  for (let i = 0; i < days; i++) {
    const date = subDays(today, i);
    
    // Calculate for all users
    await calculateMetricsForDate(date);
    
    // Calculate for specific users if provided
    if (userIds && userIds.length > 0) {
      for (const userId of userIds) {
        await calculateMetricsForDate(date, userId);
      }
    }
  }
  
  // Also calculate various date ranges
  // Last 7 days
  await calculateMetricsForDateRange(subDays(today, 7), today);
  
  // Last 30 days
  await calculateMetricsForDateRange(subDays(today, 30), today);
  
  // Last 90 days
  await calculateMetricsForDateRange(subDays(today, 90), today);
  
  console.log('Finished recalculating all metrics');
}

export default {
  calculateMetricsForDate,
  calculateMetricsForDateRange,
  recalculateRecentMetrics
};