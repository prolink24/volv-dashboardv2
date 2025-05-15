/**
 * Date Range Filter Service
 * 
 * This service provides functionality for filtering data by date range across the application.
 * It's designed to be used with any entity that has date fields, enabling consistent date filtering.
 */

import { db } from '../db';
import { and, between, gte, lte, eq, sql } from 'drizzle-orm';
import { 
  contacts, activities, deals, meetings, forms, metrics,
  type Contact, type Activity, type Deal, type Meeting, type Form, type Metrics
} from '@shared/schema';

/**
 * Represents a date range for filtering
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
  label?: string; // Optional label (e.g., "Last 30 days", "This month", etc.)
}

/**
 * Parse a date range string in the format "YYYY-MM-DD_YYYY-MM-DD"
 * @param dateRangeStr Date range string in the format "YYYY-MM-DD_YYYY-MM-DD"
 * @returns DateRange object
 */
export function parseDateRangeString(dateRangeStr: string): DateRange {
  const [startStr, endStr] = dateRangeStr.split('_');
  
  if (!startStr || !endStr) {
    throw new Error(`Invalid date range format: ${dateRangeStr}. Expected "YYYY-MM-DD_YYYY-MM-DD"`);
  }
  
  const startDate = new Date(startStr);
  const endDate = new Date(endStr);
  
  // Set end date to the end of the day (23:59:59.999)
  endDate.setHours(23, 59, 59, 999);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error(`Invalid date range: ${dateRangeStr}. Failed to parse dates.`);
  }
  
  return { startDate, endDate };
}

/**
 * Format a DateRange object to a string in the format "YYYY-MM-DD_YYYY-MM-DD"
 * @param dateRange DateRange object
 * @returns Formatted date range string
 */
export function formatDateRange(dateRange: DateRange): string {
  const startStr = dateRange.startDate.toISOString().split('T')[0];
  const endStr = dateRange.endDate.toISOString().split('T')[0];
  return `${startStr}_${endStr}`;
}

/**
 * Generate a set of common date range presets
 * @returns Object with preset date ranges
 */
export function getDateRangePresets(): Record<string, DateRange> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Last 7 days
  const last7Start = new Date(today);
  last7Start.setDate(today.getDate() - 6);
  
  // Last 30 days
  const last30Start = new Date(today);
  last30Start.setDate(today.getDate() - 29);
  
  // Last 90 days
  const last90Start = new Date(today);
  last90Start.setDate(today.getDate() - 89);
  
  // This month
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  // Last month
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  
  // This quarter
  const thisQuarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
  const thisQuarterEnd = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3 + 3, 0);
  
  // This year
  const thisYearStart = new Date(today.getFullYear(), 0, 1);
  const thisYearEnd = new Date(today.getFullYear(), 11, 31);
  
  // Last year
  const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
  const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
  
  return {
    today: { startDate: today, endDate: today, label: "Today" },
    last7Days: { startDate: last7Start, endDate: today, label: "Last 7 days" },
    last30Days: { startDate: last30Start, endDate: today, label: "Last 30 days" },
    last90Days: { startDate: last90Start, endDate: today, label: "Last 90 days" },
    thisMonth: { startDate: thisMonthStart, endDate: thisMonthEnd, label: "This month" },
    lastMonth: { startDate: lastMonthStart, endDate: lastMonthEnd, label: "Last month" },
    thisQuarter: { startDate: thisQuarterStart, endDate: thisQuarterEnd, label: "This quarter" },
    thisYear: { startDate: thisYearStart, endDate: thisYearEnd, label: "This year" },
    lastYear: { startDate: lastYearStart, endDate: lastYearEnd, label: "Last year" }
  };
}

/**
 * Filter contacts by date range
 * @param dateRange DateRange object
 * @param dateField Which date field to filter on ('createdAt', 'updatedAt', 'lastActivityDate', etc.)
 * @returns Array of contacts within the date range
 */
export async function getContactsByDateRange(
  dateRange: DateRange,
  dateField: keyof Contact = 'createdAt'
): Promise<Contact[]> {
  return db
    .select()
    .from(contacts)
    .where(
      and(
        gte(contacts[dateField], dateRange.startDate),
        lte(contacts[dateField], dateRange.endDate)
      )
    );
}

/**
 * Filter activities by date range
 * @param dateRange DateRange object
 * @returns Array of activities within the date range
 */
export async function getActivitiesByDateRange(dateRange: DateRange): Promise<Activity[]> {
  return db
    .select()
    .from(activities)
    .where(
      and(
        gte(activities.date, dateRange.startDate),
        lte(activities.date, dateRange.endDate)
      )
    );
}

/**
 * Filter deals by date range
 * @param dateRange DateRange object
 * @param dateField Which date field to filter on ('createdAt', 'updatedAt', 'closeDate', etc.)
 * @returns Array of deals within the date range
 */
export async function getDealsByDateRange(
  dateRange: DateRange,
  dateField: keyof Deal = 'createdAt'
): Promise<Deal[]> {
  return db
    .select()
    .from(deals)
    .where(
      and(
        gte(deals[dateField], dateRange.startDate),
        lte(deals[dateField], dateRange.endDate)
      )
    );
}

/**
 * Filter meetings by date range
 * @param dateRange DateRange object
 * @returns Array of meetings within the date range
 */
export async function getMeetingsByDateRange(dateRange: DateRange): Promise<Meeting[]> {
  return db
    .select()
    .from(meetings)
    .where(
      and(
        gte(meetings.startTime, dateRange.startDate),
        lte(meetings.startTime, dateRange.endDate)
      )
    );
}

/**
 * Filter forms by date range
 * @param dateRange DateRange object
 * @returns Array of forms within the date range
 */
export async function getFormsByDateRange(dateRange: DateRange): Promise<Form[]> {
  return db
    .select()
    .from(forms)
    .where(
      and(
        gte(forms.submittedAt, dateRange.startDate),
        lte(forms.submittedAt, dateRange.endDate)
      )
    );
}

/**
 * Get metrics for a specific date range
 * @param dateRange DateRange object
 * @param userId Optional user ID to filter by
 * @returns Metrics for the date range
 */
export async function getMetricsByDateRange(
  dateRange: DateRange,
  userId?: string
): Promise<Metrics | null> {
  // Format date range as string (YYYY-MM-DD_YYYY-MM-DD)
  const dateRangeStr = formatDateRange(dateRange);
  
  // Build query conditions
  const conditions = [eq(metrics.dateRange, dateRangeStr)];
  
  // Add user filter if provided
  if (userId) {
    conditions.push(eq(metrics.userId, userId));
  }
  
  // Query for existing metrics
  const results = await db
    .select()
    .from(metrics)
    .where(and(...conditions))
    .limit(1);
  
  return results.length > 0 ? results[0] : null;
}

/**
 * Save metrics for a specific date range (used for caching)
 * @param metricsData Metrics data to save
 * @param dateRange DateRange object
 * @param userId Optional user ID to associate with the metrics
 * @returns Created/updated metrics
 */
export async function saveMetricsForDateRange(
  metricsData: Partial<Metrics>,
  dateRange: DateRange,
  userId?: string
): Promise<Metrics> {
  const dateRangeStr = formatDateRange(dateRange);
  
  // Check if metrics already exist for this date range and user
  const existingMetrics = await getMetricsByDateRange(dateRange, userId);
  
  if (existingMetrics) {
    // Update existing metrics
    const [updated] = await db
      .update(metrics)
      .set({
        ...metricsData,
        dateRange: dateRangeStr,
        userId: userId,
      })
      .where(eq(metrics.id, existingMetrics.id))
      .returning();
    
    return updated;
  } else {
    // Create new metrics
    const [created] = await db
      .insert(metrics)
      .values({
        ...metricsData,
        createdAt: new Date(), // Current date as the creation date
        dateRange: dateRangeStr,
        userId: userId,
      })
      .returning();
    
    return created;
  }
}

/**
 * Calculate date range stats for contacts
 * @param dateRange DateRange object
 * @returns Statistics about contacts in the date range
 */
export async function getContactStatsByDateRange(dateRange: DateRange): Promise<{
  total: number;
  withDeals: number;
  withActivities: number;
  withMeetings: number;
  withMultipleSources: number;
  sourcesDistribution: Record<string, number>;
}> {
  // Get all contacts in the date range
  const contactsInRange = await getContactsByDateRange(dateRange);
  
  // Get contacts with deals in the date range
  const contactsWithDeals = await db
    .select({ contactId: deals.contactId })
    .from(deals)
    .where(
      and(
        gte(deals.createdAt, dateRange.startDate),
        lte(deals.createdAt, dateRange.endDate)
      )
    )
    .groupBy(deals.contactId);
  
  // Get contacts with activities in the date range
  const contactsWithActivities = await db
    .select({ contactId: activities.contactId })
    .from(activities)
    .where(
      and(
        gte(activities.date, dateRange.startDate),
        lte(activities.date, dateRange.endDate)
      )
    )
    .groupBy(activities.contactId);
  
  // Get contacts with meetings in the date range
  const contactsWithMeetings = await db
    .select({ contactId: meetings.contactId })
    .from(meetings)
    .where(
      and(
        gte(meetings.meetingDate, dateRange.startDate),
        lte(meetings.meetingDate, dateRange.endDate)
      )
    )
    .groupBy(meetings.contactId);
  
  // Count contacts with multiple sources
  const contactsWithMultipleSources = contactsInRange.filter(contact => 
    (contact.sourcesCount || 0) > 1
  );
  
  // Calculate source distribution
  const sourceDistribution: Record<string, number> = {};
  contactsInRange.forEach(contact => {
    const source = contact.leadSource || 'unknown';
    sourceDistribution[source] = (sourceDistribution[source] || 0) + 1;
  });
  
  return {
    total: contactsInRange.length,
    withDeals: contactsWithDeals.length,
    withActivities: contactsWithActivities.length,
    withMeetings: contactsWithMeetings.length,
    withMultipleSources: contactsWithMultipleSources.length,
    sourcesDistribution: sourceDistribution
  };
}

/**
 * Calculate date range stats for deals
 * @param dateRange DateRange object
 * @returns Statistics about deals in the date range
 */
export async function getDealStatsByDateRange(dateRange: DateRange): Promise<{
  total: number;
  won: number;
  lost: number;
  open: number;
  totalValue: number;
  cashCollected: number;
  contractedValue: number;
  avgDealSize: number;
  avgDaysToClose: number;
  statusDistribution: Record<string, number>;
}> {
  // Get all deals in the date range
  const dealsInRange = await getDealsByDateRange(dateRange);
  
  // Count deals by status
  const won = dealsInRange.filter(deal => deal.status === 'won').length;
  const lost = dealsInRange.filter(deal => deal.status === 'lost').length;
  const open = dealsInRange.filter(deal => 
    deal.status !== 'won' && deal.status !== 'lost'
  ).length;
  
  // Calculate total values
  let totalValue = 0;
  let cashCollected = 0;
  let contractedValue = 0;
  
  dealsInRange.forEach(deal => {
    totalValue += Number(deal.value) || 0;
    cashCollected += Number(deal.cashCollected) || 0;
    contractedValue += Number(deal.contractedValue) || 0;
  });
  
  // Calculate average deal size
  const avgDealSize = dealsInRange.length > 0 ? totalValue / dealsInRange.length : 0;
  
  // Calculate average days to close
  // This assumes deals have created_date and close_date
  const closedDeals = dealsInRange.filter(deal => 
    deal.status === 'won' && deal.createdAt && deal.closeDate
  );
  
  let totalDaysToClose = 0;
  closedDeals.forEach(deal => {
    if (deal.createdAt && deal.closeDate) {
      const daysToClose = Math.round((deal.closeDate.getTime() - deal.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      totalDaysToClose += daysToClose;
    }
  });
  
  const avgDaysToClose = closedDeals.length > 0 ? totalDaysToClose / closedDeals.length : 0;
  
  // Calculate status distribution
  const statusDistribution: Record<string, number> = {};
  dealsInRange.forEach(deal => {
    const status = deal.status || 'unknown';
    statusDistribution[status] = (statusDistribution[status] || 0) + 1;
  });
  
  return {
    total: dealsInRange.length,
    won,
    lost,
    open,
    totalValue,
    cashCollected,
    contractedValue,
    avgDealSize,
    avgDaysToClose,
    statusDistribution
  };
}

/**
 * Calculate date range stats for activities
 * @param dateRange DateRange object
 * @returns Statistics about activities in the date range
 */
export async function getActivityStatsByDateRange(dateRange: DateRange): Promise<{
  total: number;
  calls: number;
  emails: number;
  tasks: number;
  notes: number;
  other: number;
  callDuration: number;
  avgCallDuration: number;
  callsAnswered: number;
  callsUnanswered: number;
  typeDistribution: Record<string, number>;
}> {
  // Get all activities in the date range
  const activitiesInRange = await getActivitiesByDateRange(dateRange);
  
  // Count activities by type
  const calls = activitiesInRange.filter(activity => activity.type === 'call').length;
  const emails = activitiesInRange.filter(activity => activity.type === 'email').length;
  const tasks = activitiesInRange.filter(activity => activity.type === 'task').length;
  const notes = activitiesInRange.filter(activity => activity.type === 'note').length;
  const other = activitiesInRange.filter(activity => 
    !['call', 'email', 'task', 'note'].includes(activity.type || '')
  ).length;
  
  // Calculate call statistics
  const callActivities = activitiesInRange.filter(activity => activity.type === 'call');
  let totalCallDuration = 0;
  let callsAnswered = 0;
  let callsUnanswered = 0;
  
  callActivities.forEach(call => {
    totalCallDuration += Number(call.call_duration) || 0;
    
    if (call.call_outcome === 'answered' || call.call_outcome === 'completed') {
      callsAnswered++;
    } else if (call.call_outcome === 'no-answer' || call.call_outcome === 'voicemail' || call.call_outcome === 'busy') {
      callsUnanswered++;
    }
  });
  
  const avgCallDuration = calls > 0 ? totalCallDuration / calls : 0;
  
  // Calculate type distribution
  const typeDistribution: Record<string, number> = {};
  activitiesInRange.forEach(activity => {
    const type = activity.type || 'unknown';
    typeDistribution[type] = (typeDistribution[type] || 0) + 1;
  });
  
  return {
    total: activitiesInRange.length,
    calls,
    emails,
    tasks,
    notes,
    other,
    callDuration: totalCallDuration,
    avgCallDuration,
    callsAnswered,
    callsUnanswered,
    typeDistribution
  };
}

/**
 * Calculate date range stats for meetings
 * @param dateRange DateRange object
 * @returns Statistics about meetings in the date range
 */
export async function getMeetingStatsByDateRange(dateRange: DateRange): Promise<{
  total: number;
  attended: number;
  canceled: number;
  rescheduled: number;
  noShow: number;
  avgDuration: number;
  statusDistribution: Record<string, number>;
}> {
  // Get all meetings in the date range
  const meetingsInRange = await getMeetingsByDateRange(dateRange);
  
  // Count meetings by status
  const attended = meetingsInRange.filter(meeting => meeting.status === 'attended').length;
  const canceled = meetingsInRange.filter(meeting => meeting.status === 'canceled').length;
  const rescheduled = meetingsInRange.filter(meeting => meeting.rescheduled === true).length;
  const noShow = meetingsInRange.filter(meeting => meeting.status === 'no-show').length;
  
  // Calculate average duration
  let totalDuration = 0;
  meetingsInRange.forEach(meeting => {
    totalDuration += Number(meeting.duration) || 0;
  });
  
  const avgDuration = meetingsInRange.length > 0 ? totalDuration / meetingsInRange.length : 0;
  
  // Calculate status distribution
  const statusDistribution: Record<string, number> = {};
  meetingsInRange.forEach(meeting => {
    const status = meeting.status || 'unknown';
    statusDistribution[status] = (statusDistribution[status] || 0) + 1;
  });
  
  return {
    total: meetingsInRange.length,
    attended,
    canceled,
    rescheduled,
    noShow,
    avgDuration,
    statusDistribution
  };
}

/**
 * Get comprehensive dashboard data for a specific date range
 * @param dateRange DateRange object
 * @param userId Optional user ID to filter by
 * @returns Dashboard data filtered by date range
 */
export async function getDashboardDataByDateRange(
  dateRange: DateRange,
  userId?: string
): Promise<any> {
  // First, check if we have cached metrics for this date range
  const cachedMetrics = await getMetricsByDateRange(dateRange, userId);
  
  if (cachedMetrics && cachedMetrics.kpis) {
    // Use cached data if available
    return cachedMetrics.kpis;
  }
  
  // Otherwise, calculate fresh metrics
  const contactStats = await getContactStatsByDateRange(dateRange);
  const dealStats = await getDealStatsByDateRange(dateRange);
  const activityStats = await getActivityStatsByDateRange(dateRange);
  const meetingStats = await getMeetingStatsByDateRange(dateRange);
  
  // Build KPIs
  const kpis = {
    closedDeals: dealStats.won,
    cashCollected: dealStats.cashCollected,
    revenueGenerated: dealStats.totalValue,
    totalCalls: activityStats.calls,
    call1Taken: activityStats.callsAnswered,
    call2Taken: meetingStats.attended,
    closingRate: dealStats.total > 0 ? (dealStats.won / dealStats.total) * 100 : 0,
    avgCashCollected: dealStats.won > 0 ? dealStats.cashCollected / dealStats.won : 0,
    solutionCallShowRate: meetingStats.total > 0 ? (meetingStats.attended / meetingStats.total) * 100 : 0,
    earningPerCall2: meetingStats.attended > 0 ? dealStats.cashCollected / meetingStats.attended : 0
  };
  
  const dashboardData = {
    kpis,
    contactStats,
    dealStats,
    activityStats,
    meetingStats,
  };
  
  // Cache the metrics for future use
  await saveMetricsForDateRange(
    { 
      kpis: dashboardData as any, 
      dateRange: formatDateRange(dateRange) 
    },
    dateRange,
    userId
  );
  
  return dashboardData;
}