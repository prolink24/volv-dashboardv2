/**
 * API Test for Calendly Call Data
 * 
 * This script tests the API to verify Calendly call data is properly returned
 * in the dashboard API response and that it's being filtered correctly by date range.
 */

import axios from 'axios';
import chalk from 'chalk';
import { format } from 'date-fns';
import { db } from '../db';
import { meetings } from '@shared/schema';
import { sql, and, gte, lte, isNotNull } from 'drizzle-orm';

// Constants
const BASE_URL = 'http://localhost:3000';

// Helper functions
function log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
  const prefix = {
    info: chalk.blue('ℹ'),
    success: chalk.green('✓'),
    warning: chalk.yellow('⚠'),
    error: chalk.red('✗')
  };
  console.log(`${prefix[type]} ${message}`);
}

function hr(): void {
  console.log(chalk.gray('─'.repeat(80)));
}

// Format date for API
function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

// Format date range for API
function formatDateRange(startDate: Date, endDate: Date): string {
  return `${formatDate(startDate)}_${formatDate(endDate)}`;
}

// Get date ranges for testing
function getDateRanges() {
  const today = new Date();
  
  // Last 30 days
  const last30DaysStart = new Date(today);
  last30DaysStart.setDate(today.getDate() - 30);
  
  // April 2025
  const april2025Start = new Date(2025, 3, 1); // April (0-indexed)
  const april2025End = new Date(2025, 3, 30);
  
  return {
    last30Days: {
      label: 'Last 30 days',
      start: last30DaysStart,
      end: today,
      query: formatDateRange(last30DaysStart, today)
    },
    april2025: {
      label: 'April 2025',
      start: april2025Start,
      end: april2025End,
      query: formatDateRange(april2025Start, april2025End)
    }
  };
}

// Test database directly for meeting data
async function checkDatabaseMeetings() {
  log('Checking database for meeting data...', 'info');
  
  try {
    const dateRanges = getDateRanges();
    
    // Check all meetings
    const totalMeetings = await db.select({ count: sql<number>`count(*)` })
      .from(meetings);
    log(`Total meetings in database: ${totalMeetings[0].count}`, 'info');
    
    // Check Calendly meetings
    const calendlyMeetings = await db.select({ count: sql<number>`count(*)` })
      .from(meetings)
      .where(isNotNull(meetings.calendlyEventId));
    log(`Total Calendly meetings in database: ${calendlyMeetings[0].count}`, 'info');
    
    // Check meetings in last 30 days
    const last30DaysMeetings = await db.select({ count: sql<number>`count(*)` })
      .from(meetings)
      .where(
        and(
          gte(meetings.startTime, dateRanges.last30Days.start),
          lte(meetings.startTime, dateRanges.last30Days.end)
        )
      );
    log(`Meetings in last 30 days: ${last30DaysMeetings[0].count}`, 'info');
    
    // Check Calendly meetings in last 30 days
    const last30DaysCalendlyMeetings = await db.select({ count: sql<number>`count(*)` })
      .from(meetings)
      .where(
        and(
          gte(meetings.startTime, dateRanges.last30Days.start),
          lte(meetings.startTime, dateRanges.last30Days.end),
          isNotNull(meetings.calendlyEventId)
        )
      );
    log(`Calendly meetings in last 30 days: ${last30DaysCalendlyMeetings[0].count}`, 'info');
    
    // Check meetings in April 2025
    const april2025Meetings = await db.select({ count: sql<number>`count(*)` })
      .from(meetings)
      .where(
        and(
          gte(meetings.startTime, dateRanges.april2025.start),
          lte(meetings.startTime, dateRanges.april2025.end)
        )
      );
    log(`Meetings in April 2025: ${april2025Meetings[0].count}`, 'info');
    
    // Check Calendly meetings in April 2025
    const april2025CalendlyMeetings = await db.select({ count: sql<number>`count(*)` })
      .from(meetings)
      .where(
        and(
          gte(meetings.startTime, dateRanges.april2025.start),
          lte(meetings.startTime, dateRanges.april2025.end),
          isNotNull(meetings.calendlyEventId)
        )
      );
    log(`Calendly meetings in April 2025: ${april2025CalendlyMeetings[0].count}`, 'info');
    
    // Get sample meeting data
    const sampleMeetings = await db.select()
      .from(meetings)
      .where(isNotNull(meetings.calendlyEventId))
      .limit(3);
    
    if (sampleMeetings.length > 0) {
      log('Sample Calendly meeting data:', 'info');
      console.log(JSON.stringify(sampleMeetings[0], null, 2));
    }
    
    return {
      totalMeetings: totalMeetings[0].count,
      calendlyMeetings: calendlyMeetings[0].count,
      last30DaysMeetings: last30DaysMeetings[0].count,
      last30DaysCalendlyMeetings: last30DaysCalendlyMeetings[0].count,
      april2025Meetings: april2025Meetings[0].count,
      april2025CalendlyMeetings: april2025CalendlyMeetings[0].count
    };
  } catch (error) {
    log(`Error checking database: ${error}`, 'error');
    return null;
  }
}

// Test dashboard API for meeting and call data
async function testDashboardAPI() {
  log('Testing dashboard API for meeting and call data...', 'info');
  
  const dateRanges = getDateRanges();
  const results: any = {};
  
  for (const [rangeName, range] of Object.entries(dateRanges)) {
    log(`Testing date range: ${range.label}`, 'info');
    
    try {
      const response = await axios.get(`${BASE_URL}/api/enhanced-dashboard?dateRange=${range.query}`);
      
      if (response.status === 200) {
        log(`API call successful for ${range.label}`, 'success');
        
        const data = response.data;
        
        // Check for meetings data
        if (data.meetings) {
          log(`Found meetings data: ${data.meetings.length} meetings`, 'info');
          
          // Count Calendly meetings
          const calendlyMeetings = data.meetings.filter((m: any) => m.calendlyEventId);
          log(`Found ${calendlyMeetings.length} Calendly meetings`, 'info');
        } else {
          log('No meetings data found in API response', 'warning');
        }
        
        // Check for call KPIs
        const kpis = data.kpis || {};
        log(`Total Calls KPI: ${kpis.totalCalls?.current || 0}`, 'info');
        log(`Call 1 Taken KPI: ${kpis.call1Taken?.current || 0}`, 'info');
        log(`Call 2 Taken KPI: ${kpis.call2Taken?.current || 0}`, 'info');
        
        // Save results for this range
        results[rangeName] = {
          meetingsCount: data.meetings?.length || 0,
          calendlyMeetingsCount: data.meetings?.filter((m: any) => m.calendlyEventId).length || 0,
          totalCallsKPI: kpis.totalCalls?.current || 0,
          call1TakenKPI: kpis.call1Taken?.current || 0,
          call2TakenKPI: kpis.call2Taken?.current || 0
        };
      } else {
        log(`API call failed with status ${response.status}`, 'error');
      }
    } catch (error: any) {
      log(`Error testing ${range.label}: ${error.message}`, 'error');
      if (error.response) {
        log(`Status: ${error.response.status}`, 'error');
        log(`Response data: ${JSON.stringify(error.response.data)}`, 'error');
      }
    }
    
    hr();
  }
  
  return results;
}

// Check if meetings data is included in API endpoint response
async function checkMeetingsEndpoint() {
  log('Checking meetings endpoint...', 'info');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/meetings`);
    
    if (response.status === 200) {
      log('Meetings API call successful', 'success');
      
      const meetings = response.data;
      log(`Found ${meetings.length} meetings in API response`, 'info');
      
      // Count Calendly meetings
      const calendlyMeetings = meetings.filter((m: any) => m.calendlyEventId);
      log(`Found ${calendlyMeetings.length} Calendly meetings`, 'info');
      
      return {
        totalMeetings: meetings.length,
        calendlyMeetings: calendlyMeetings.length
      };
    } else {
      log(`Meetings API call failed with status ${response.status}`, 'error');
      return null;
    }
  } catch (error: any) {
    log(`Error checking meetings endpoint: ${error.message}`, 'error');
    if (error.response) {
      log(`Status: ${error.response.status}`, 'error');
      
      // 404 might mean the endpoint doesn't exist
      if (error.response.status === 404) {
        log('Meetings endpoint not found - this is expected if there is no dedicated meetings API', 'warning');
      }
    }
    return null;
  }
}

// Call routes API to check available endpoints
async function checkAvailableEndpoints() {
  log('Checking available API endpoints...', 'info');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/routes`);
    
    if (response.status === 200) {
      log('API routes call successful', 'success');
      
      const routes = response.data;
      log(`Found ${routes.length} available API routes`, 'info');
      
      // Look for meetings-related endpoints
      const meetingsRoutes = routes.filter((r: string) => 
        r.includes('meeting') || r.includes('calendar')
      );
      
      if (meetingsRoutes.length > 0) {
        log('Found meetings-related endpoints:', 'info');
        meetingsRoutes.forEach((r: string) => log(`- ${r}`, 'info'));
      } else {
        log('No meetings-specific endpoints found', 'warning');
      }
      
      return routes;
    } else {
      log(`API routes call failed with status ${response.status}`, 'error');
      return null;
    }
  } catch (error: any) {
    log(`Error checking API routes: ${error.message}`, 'error');
    if (error.response && error.response.status === 404) {
      log('Routes API not available - this is expected if there is no routes discovery endpoint', 'warning');
    }
    return null;
  }
}

// Main function to run all tests
async function main() {
  hr();
  log('CALENDLY CALLS DATA TEST', 'info');
  hr();
  
  // First check database
  const dbResults = await checkDatabaseMeetings();
  hr();
  
  // Test dashboard API
  const apiResults = await testDashboardAPI();
  hr();
  
  // Check meetings endpoint
  const meetingsResults = await checkMeetingsEndpoint();
  hr();
  
  // Check available endpoints
  const endpointsResults = await checkAvailableEndpoints();
  hr();
  
  // Summarize findings
  log('SUMMARY OF FINDINGS', 'info');
  
  if (dbResults) {
    log('Database:', 'info');
    log(`Total Meetings: ${dbResults.totalMeetings}`, 'info');
    log(`Calendly Meetings: ${dbResults.calendlyMeetings}`, 'info');
    log(`Last 30 Days Meetings: ${dbResults.last30DaysMeetings}`, 'info');
    log(`Last 30 Days Calendly Meetings: ${dbResults.last30DaysCalendlyMeetings}`, 'info');
    log(`April 2025 Meetings: ${dbResults.april2025Meetings}`, 'info');
    log(`April 2025 Calendly Meetings: ${dbResults.april2025CalendlyMeetings}`, 'info');
  }
  
  if (apiResults) {
    log('API Response:', 'info');
    for (const [rangeName, results] of Object.entries(apiResults)) {
      log(`${rangeName}:`, 'info');
      log(`  Meetings Count: ${(results as any).meetingsCount}`, 'info');
      log(`  Calendly Meetings Count: ${(results as any).calendlyMeetingsCount}`, 'info');
      log(`  Total Calls KPI: ${(results as any).totalCallsKPI}`, 'info');
      log(`  Call 1 Taken KPI: ${(results as any).call1TakenKPI}`, 'info');
      log(`  Call 2 Taken KPI: ${(results as any).call2TakenKPI}`, 'info');
    }
  }
  
  // Identify issues
  log('IDENTIFIED ISSUES:', 'info');
  
  if (!dbResults) {
    log('Error connecting to database', 'error');
  } else {
    if (dbResults.calendlyMeetings === 0) {
      log('No Calendly meetings found in database', 'error');
    } else if (dbResults.last30DaysCalendlyMeetings === 0 && dbResults.april2025CalendlyMeetings > 0) {
      log('No Calendly meetings in last 30 days, but found meetings in April 2025', 'warning');
      log('Try changing the date range in the dashboard to April 2025', 'info');
    }
  }
  
  if (apiResults) {
    const last30Days = apiResults.last30Days || { meetingsCount: 0, calendlyMeetingsCount: 0 };
    const april2025 = apiResults.april2025 || { meetingsCount: 0, calendlyMeetingsCount: 0 };
    
    if ((last30Days as any).meetingsCount === 0 && (dbResults?.last30DaysMeetings || 0) > 0) {
      log('Meetings exist in database for last 30 days but not returned by API', 'error');
    }
    
    if ((april2025 as any).meetingsCount === 0 && (dbResults?.april2025Meetings || 0) > 0) {
      log('Meetings exist in database for April 2025 but not returned by API', 'error');
    }
    
    if ((last30Days as any).totalCallsKPI === 0 && (dbResults?.last30DaysCalendlyMeetings || 0) > 0) {
      log('Calendly calls not reflected in Total Calls KPI for last 30 days', 'error');
    }
    
    if ((april2025 as any).totalCallsKPI === 0 && (dbResults?.april2025CalendlyMeetings || 0) > 0) {
      log('Calendly calls not reflected in Total Calls KPI for April 2025', 'error');
    }
  }
  
  // Provide recommendations
  hr();
  log('RECOMMENDATIONS:', 'info');
  
  if (dbResults && dbResults.calendlyMeetings > 0) {
    if (dbResults.last30DaysCalendlyMeetings === 0 && dbResults.april2025CalendlyMeetings > 0) {
      log('1. Try changing the date range to April 2025 where Calendly calls exist', 'info');
    }
    
    if (apiResults && Object.values(apiResults).some((r: any) => !r.meetingsCount)) {
      log('2. Check if the dashboard API is returning meetings data correctly', 'info');
      log('   - Ensure API includes meetings in the response', 'info');
      log('   - Verify date filtering logic in the API', 'info');
    }
    
    if (apiResults && Object.values(apiResults).some((r: any) => r.calendlyMeetingsCount > 0 && r.totalCallsKPI === 0)) {
      log('3. Enhance KPI calculation logic to include Calendly calls', 'info');
      log('   - Update dashboard API to count Calendly calls in the KPIs', 'info');
    }
  } else if (dbResults && dbResults.calendlyMeetings === 0) {
    log('1. Sync Calendly data to import meetings', 'info');
  }
  
  hr();
}

main().catch(error => {
  console.error('Error running script:', error);
  process.exit(1);
});