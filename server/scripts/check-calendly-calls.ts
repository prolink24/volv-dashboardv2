/**
 * Check Calendly Calls
 * 
 * This script directly analyzes the database and API responses to diagnose
 * why Calendly calls aren't showing correctly on the dashboard for the
 * last 30 days timeframe.
 */

import { db } from '../db';
import { meetings } from '@shared/schema';
import { sql, count, gte, lte, and, isNotNull } from 'drizzle-orm';
import axios from 'axios';
import chalk from 'chalk';

// Helper functions
function log(message: string): void {
  console.log(`${chalk.blue('ℹ')} ${message}`);
}

function success(message: string): void {
  console.log(`${chalk.green('✓')} ${message}`);
}

function warn(message: string): void {
  console.log(`${chalk.yellow('⚠')} ${message}`);
}

function error(message: string): void {
  console.log(`${chalk.red('✗')} ${message}`);
}

function hr(): void {
  console.log(chalk.gray('─'.repeat(80)));
}

// Calculate date range for the last 30 days
function getLast30DaysRange() {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 30);
  
  return { startDate, endDate };
}

// Direct database check for meeting counts
async function checkMeetingsInDatabase() {
  log('Checking meetings directly in the database...');
  
  try {
    const { startDate, endDate } = getLast30DaysRange();
    
    // Format dates for display
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    log(`Date range: ${startStr} to ${endStr}`);
    
    // Query all meetings
    const allMeetingsCount = await db.select({ count: count() }).from(meetings);
    success(`Total meetings in database: ${allMeetingsCount[0].count}`);
    
    // Query Calendly meetings
    const calendlyMeetingsCount = await db.select({ count: count() })
      .from(meetings)
      .where(isNotNull(meetings.calendlyEventId));
    success(`Total Calendly meetings in database: ${calendlyMeetingsCount[0].count}`);
    
    // Query meetings in the last 30 days
    const dateRangeMeetingsCount = await db.select({ count: count() })
      .from(meetings)
      .where(
        and(
          gte(meetings.startTime, startDate),
          lte(meetings.startTime, endDate)
        )
      );
    success(`Meetings in last 30 days: ${dateRangeMeetingsCount[0].count}`);
    
    // Query Calendly meetings in the last 30 days
    const calendlyDateRangeMeetingsCount = await db.select({ count: count() })
      .from(meetings)
      .where(
        and(
          gte(meetings.startTime, startDate),
          lte(meetings.startTime, endDate),
          isNotNull(meetings.calendlyEventId)
        )
      );
    success(`Calendly meetings in last 30 days: ${calendlyDateRangeMeetingsCount[0].count}`);
    
    // Get sample meeting data for debugging
    const sampleMeetings = await db.select()
      .from(meetings)
      .where(isNotNull(meetings.calendlyEventId))
      .limit(5);
    
    if (sampleMeetings.length > 0) {
      log('Sample Calendly meeting data:');
      console.log(JSON.stringify(sampleMeetings[0], null, 2));
    } else {
      warn('No Calendly meetings found to display as sample');
    }
    
    return {
      totalMeetings: allMeetingsCount[0].count,
      totalCalendlyMeetings: calendlyMeetingsCount[0].count,
      last30DaysMeetings: dateRangeMeetingsCount[0].count,
      last30DaysCalendlyMeetings: calendlyDateRangeMeetingsCount[0].count
    };
  } catch (e) {
    error(`Database query error: ${e}`);
    return null;
  }
}

// Check API endpoints for meeting data
async function checkAPIEndpoints() {
  log('Checking API endpoints for meeting data...');
  
  const { startDate, endDate } = getLast30DaysRange();
  const dateParam = `${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
  
  try {
    // Check dashboard endpoint
    log('Testing dashboard API endpoint...');
    const dashboardResponse = await axios.get(`http://localhost:3000/api/enhanced-dashboard?dateRange=${dateParam}`);
    
    if (dashboardResponse.status === 200) {
      success('Dashboard API returned data successfully');
      
      const data = dashboardResponse.data;
      const meetings = data.meetings || [];
      const kpis = data.kpis || {};
      
      log(`Total meetings in response: ${meetings.length}`);
      log(`Total calls KPI: ${kpis.totalCalls?.current || 0}`);
      
      // Check if meeting data matches database counts
      if (meetings.length === 0) {
        warn('Dashboard API returned 0 meetings');
      }
    } else {
      error(`Dashboard API call failed with status ${dashboardResponse.status}`);
    }
    
    // Check attribution stats endpoint
    log('Testing attribution stats API endpoint...');
    const attributionResponse = await axios.get(`http://localhost:3000/api/attribution/stats?dateRange=${dateParam}`);
    
    if (attributionResponse.status === 200) {
      success('Attribution API returned data successfully');
      
      const data = attributionResponse.data;
      const meetingStats = data.meetingStats || {};
      
      log(`Meeting stats from attribution API:`);
      log(`Total meetings: ${meetingStats.total || 0}`);
      log(`Scheduled: ${meetingStats.scheduled || 0}`);
      log(`Completed: ${meetingStats.completed || 0}`);
      log(`Canceled: ${meetingStats.canceled || 0}`);
      
      // Check if meeting stats match database counts
      if (!meetingStats.total || meetingStats.total === 0) {
        warn('Attribution API returned 0 total meetings');
      }
    } else {
      error(`Attribution API call failed with status ${attributionResponse.status}`);
    }
    
    return {
      dashboardSuccess: dashboardResponse.status === 200,
      attributionSuccess: attributionResponse.status === 200
    };
  } catch (e) {
    error(`API request error: ${e.message}`);
    return null;
  }
}

// Function to check date range filtering logic 
async function checkDateFilteringLogic() {
  log('Checking date range filtering logic in the codebase...');
  
  try {
    // Check meeting counts for different fixed date ranges to identify potential issues
    
    // Check April 2025 (a month with known data)
    const april2025Start = new Date(2025, 3, 1); // April is month 3 (0-indexed)
    const april2025End = new Date(2025, 3, 30);
    
    const april2025MeetingsCount = await db.select({ count: count() })
      .from(meetings)
      .where(
        and(
          gte(meetings.startTime, april2025Start),
          lte(meetings.startTime, april2025End)
        )
      );
    
    log(`Meetings in April 2025: ${april2025MeetingsCount[0].count}`);
    
    // Check entire year 2025
    const year2025Start = new Date(2025, 0, 1);
    const year2025End = new Date(2025, 11, 31);
    
    const year2025MeetingsCount = await db.select({ count: count() })
      .from(meetings)
      .where(
        and(
          gte(meetings.startTime, year2025Start),
          lte(meetings.startTime, year2025End)
        )
      );
    
    log(`Meetings in entire year 2025: ${year2025MeetingsCount[0].count}`);
    
    return {
      april2025Meetings: april2025MeetingsCount[0].count,
      year2025Meetings: year2025MeetingsCount[0].count
    };
  } catch (e) {
    error(`Error checking date filtering: ${e}`);
    return null;
  }
}

// Main function
async function main() {
  hr();
  log('CALENDLY CALL DATA AUDIT');
  hr();
  
  // Step 1: Check database for meeting data
  const dbResults = await checkMeetingsInDatabase();
  hr();
  
  // Step 2: Check API endpoints
  const apiResults = await checkAPIEndpoints();
  hr();
  
  // Step 3: Check date filtering logic
  const dateFilterResults = await checkDateFilteringLogic();
  hr();
  
  // Summary of findings
  log('SUMMARY OF FINDINGS:');
  
  if (dbResults) {
    if (dbResults.totalCalendlyMeetings === 0) {
      error('No Calendly meetings exist in the database. This is the root cause of the issue.');
      log('Action needed: Run the Calendly sync script to import meetings from Calendly');
    } else if (dbResults.last30DaysCalendlyMeetings === 0) {
      warn('Calendly meetings exist in the database but none in the last 30 days period');
      log('Possible solution: Check if there are meetings in other date ranges');
    } else if (dbResults.last30DaysCalendlyMeetings > 0 && apiResults?.dashboardSuccess) {
      error('Calendly meetings exist in the database for the last 30 days but are not showing in the dashboard');
      log('Possible issues:');
      log('1. Dashboard API is not correctly including Calendly meeting data');
      log('2. Frontend rendering issue with the meeting data');
      log('3. Cache might need to be cleared');
    }
  }
  
  if (dateFilterResults && dateFilterResults.april2025Meetings > 0) {
    log('Meetings exist for April 2025. Try using this as a test date range in the dashboard');
  }
  
  hr();
  log('RECOMMENDED NEXT STEPS:');
  
  if (dbResults?.totalCalendlyMeetings === 0) {
    log('1. Run the Calendly sync script to import meetings');
    log('2. Verify API credentials for Calendly are correct');
  } else if (dbResults?.last30DaysCalendlyMeetings === 0) {
    log('1. Check if Calendly meetings exist in other date ranges (try April 2025)');
    log('2. If other date ranges have data, the issue may be with recent sync');
  } else {
    log('1. Verify the dashboard API is including Calendly meeting data in the response');
    log('2. Check if the data is filtered out in the frontend components');
    log('3. Clear any data caches that might be affecting the dashboard');
  }
  hr();
}

// Run the script
main().catch(e => {
  error(`Script error: ${e}`);
  process.exit(1);
});