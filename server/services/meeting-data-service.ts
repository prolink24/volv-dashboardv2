/**
 * Meeting Data Service
 * 
 * This service provides functionality for retrieving and analyzing meeting data,
 * with a focus on Calendly meetings that should be counted as calls in the dashboard.
 */

import { db } from '../db';
import { meetings } from '@shared/schema';
import { and, gte, lte, isNotNull, sql, count } from 'drizzle-orm';

/**
 * Get meetings for a specific date range, optionally filtered by user
 */
export async function getMeetingsForDateRange(
  startDate: Date,
  endDate: Date,
  userId?: string
): Promise<any[]> {
  try {
    console.log(`Fetching meetings from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Create date range filter
    const dateFilter = and(
      gte(meetings.startTime, startDate),
      lte(meetings.startTime, endDate)
    );
    
    // Add user filter if specified
    const filters = userId ? and(dateFilter, sql`${meetings.assignedTo} = ${userId}`) : dateFilter;
    
    // Query the meetings table with filters
    const meetingsData = await db.select().from(meetings).where(filters);
    
    console.log(`Found ${meetingsData.length} meetings in date range`);
    return meetingsData;
  } catch (error) {
    console.error('Error fetching meetings for date range:', error);
    return [];
  }
}

/**
 * Get meeting statistics for KPIs
 */
export async function getMeetingStats(
  startDate: Date,
  endDate: Date,
  userId?: string,
  previousPeriod: boolean = false
): Promise<{
  total: number;
  calendly: number;
  call1Count: number;
  call2Count: number;
}> {
  try {
    // Create date range filter
    const dateFilter = and(
      gte(meetings.startTime, startDate),
      lte(meetings.startTime, endDate)
    );
    
    // Add user filter if specified
    const filters = userId ? and(dateFilter, sql`${meetings.assignedTo} = ${userId}`) : dateFilter;
    
    // Get total meeting count
    const totalMeetingsResult = await db.select({ count: count() }).from(meetings).where(filters);
    const totalMeetings = totalMeetingsResult[0]?.count || 0;
    
    // Get Calendly meeting count
    const calendlyMeetingsFilter = userId 
      ? and(dateFilter, isNotNull(meetings.calendlyEventId), sql`${meetings.assignedTo} = ${userId}`)
      : and(dateFilter, isNotNull(meetings.calendlyEventId));
    
    const calendlyMeetingsResult = await db.select({ count: count() })
      .from(meetings)
      .where(calendlyMeetingsFilter);
    const calendlyMeetings = calendlyMeetingsResult[0]?.count || 0;
    
    // Analyze meeting types to determine Call 1 vs Call 2
    // In a real system, this would be based on metadata or sequence,
    // but for this example we'll count based on meeting type
    const allMeetings = await db.select().from(meetings).where(filters);
    
    // Count Call 1 and Call 2 based on type/title
    const call1Count = allMeetings.filter(meeting => {
      const title = (meeting.title || '').toLowerCase();
      return title.includes('triage') || title.includes('discovery') || title.includes('intro');
    }).length;
    
    const call2Count = allMeetings.filter(meeting => {
      const title = (meeting.title || '').toLowerCase();
      return title.includes('solution') || title.includes('strategy') || title.includes('demo');
    }).length;
    
    console.log(`Meeting stats for ${previousPeriod ? 'previous' : 'current'} period:`, {
      total: totalMeetings,
      calendly: calendlyMeetings,
      call1: call1Count,
      call2: call2Count
    });
    
    return {
      total: totalMeetings,
      calendly: calendlyMeetings,
      call1Count,
      call2Count
    };
  } catch (error) {
    console.error('Error getting meeting stats:', error);
    return { total: 0, calendly: 0, call1Count: 0, call2Count: 0 };
  }
}

/**
 * Calculate KPIs from meeting data for the dashboard
 */
export async function calculateMeetingKPIs(
  startDate: Date,
  endDate: Date,
  previousStartDate: Date,
  previousEndDate: Date,
  userId?: string
): Promise<{
  totalCalls: { current: number; previous: number; change: number };
  call1Taken: { current: number; previous: number; change: number };
  call2Taken: { current: number; previous: number; change: number };
}> {
  try {
    // Get current period stats
    const currentStats = await getMeetingStats(startDate, endDate, userId);
    
    // Get previous period stats
    const previousStats = await getMeetingStats(previousStartDate, previousEndDate, userId, true);
    
    // Calculate percent changes with safeguards for division by zero
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };
    
    // Generate KPI object
    return {
      totalCalls: {
        current: currentStats.total,
        previous: previousStats.total,
        change: calculateChange(currentStats.total, previousStats.total)
      },
      call1Taken: {
        current: currentStats.call1Count,
        previous: previousStats.call1Count,
        change: calculateChange(currentStats.call1Count, previousStats.call1Count)
      },
      call2Taken: {
        current: currentStats.call2Count,
        previous: previousStats.call2Count,
        change: calculateChange(currentStats.call2Count, previousStats.call2Count)
      }
    };
  } catch (error) {
    console.error('Error calculating meeting KPIs:', error);
    return {
      totalCalls: { current: 0, previous: 0, change: 0 },
      call1Taken: { current: 0, previous: 0, change: 0 },
      call2Taken: { current: 0, previous: 0, change: 0 }
    };
  }
}