/**
 * Test Dashboard Call Data
 * 
 * This script tests the dashboard API to verify that Calendly call data 
 * is correctly returned for different date ranges, with a focus on the 
 * last 30 days filter.
 */

import axios from 'axios';
import chalk from 'chalk';
import { format } from 'date-fns';

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

function formatDateRange(startDate: Date, endDate: Date): string {
  return `${format(startDate, 'yyyy-MM-dd')}_${format(endDate, 'yyyy-MM-dd')}`;
}

// Create date ranges for testing
function getDateRanges() {
  const today = new Date();
  
  // Last 30 days
  const last30DaysStart = new Date(today);
  last30DaysStart.setDate(today.getDate() - 30);
  
  // Last 7 days
  const last7DaysStart = new Date(today);
  last7DaysStart.setDate(today.getDate() - 7);
  
  // Current month
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  
  // Previous month
  const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  
  // Test specific period (April 2025)
  const april2025Start = new Date(2025, 3, 1); // April is month 3 (0-indexed)
  const april2025End = new Date(2025, 3, 30);
  
  return {
    last30Days: {
      label: 'Last 30 days',
      start: last30DaysStart,
      end: today,
      query: formatDateRange(last30DaysStart, today)
    },
    last7Days: {
      label: 'Last 7 days',
      start: last7DaysStart,
      end: today,
      query: formatDateRange(last7DaysStart, today)
    },
    currentMonth: {
      label: 'Current month',
      start: currentMonthStart,
      end: today,
      query: formatDateRange(currentMonthStart, today)
    },
    prevMonth: {
      label: 'Previous month',
      start: prevMonthStart,
      end: prevMonthEnd,
      query: formatDateRange(prevMonthStart, prevMonthEnd)
    },
    april2025: {
      label: 'April 2025',
      start: april2025Start,
      end: april2025End,
      query: formatDateRange(april2025Start, april2025End)
    }
  };
}

// Test dashboard API with different date ranges
async function testDashboardAPI() {
  log('Starting dashboard call data tests', 'info');
  hr();
  
  const dateRanges = getDateRanges();
  
  for (const [rangeName, range] of Object.entries(dateRanges)) {
    log(`Testing date range: ${range.label} (${range.start.toDateString()} to ${range.end.toDateString()})`, 'info');
    
    try {
      const response = await axios.get(`${BASE_URL}/api/enhanced-dashboard?dateRange=${range.query}`);
      
      if (response.status === 200) {
        log(`API call successful for ${range.label}`, 'success');
        
        // Check if meeting data exists
        const data = response.data;
        const meetings = data.meetings || [];
        const kpis = data.kpis || {};
        
        log(`Total meetings in response: ${meetings.length}`, 'info');
        log(`Total calls KPI: ${kpis.totalCalls?.current || 0}`, 'info');
        log(`Call1 taken KPI: ${kpis.call1Taken?.current || 0}`, 'info');
        log(`Call2 taken KPI: ${kpis.call2Taken?.current || 0}`, 'info');
        
        // Check for Calendly data specifically
        const calendlyMeetings = meetings.filter((m: any) => m.calendlyEventId);
        log(`Calendly meetings: ${calendlyMeetings.length} out of ${meetings.length}`, 'info');
        
        if (meetings.length === 0) {
          log(`No meetings found for ${range.label}`, 'warning');
        }
        
        if (calendlyMeetings.length === 0 && meetings.length > 0) {
          log(`No Calendly meetings found for ${range.label} despite having ${meetings.length} total meetings`, 'warning');
        }
      } else {
        log(`API call failed for ${range.label} with status ${response.status}`, 'error');
      }
    } catch (error: any) {
      log(`Error testing ${range.label}: ${error.message}`, 'error');
      if (error.response) {
        log(`Status: ${error.response.status}`, 'error');
        log(`Response: ${JSON.stringify(error.response.data, null, 2)}`, 'error');
      }
    }
    
    hr();
  }
}

// Test attribution stats API with different date ranges
async function testAttributionAPI() {
  log('Starting attribution stats call data tests', 'info');
  hr();
  
  const dateRanges = getDateRanges();
  
  for (const [rangeName, range] of Object.entries(dateRanges)) {
    log(`Testing date range: ${range.label} (${range.start.toDateString()} to ${range.end.toDateString()})`, 'info');
    
    try {
      const response = await axios.get(`${BASE_URL}/api/attribution/stats?dateRange=${range.query}`);
      
      if (response.status === 200) {
        log(`API call successful for ${range.label}`, 'success');
        
        // Check if meeting data exists
        const data = response.data;
        const meetingStats = data.meetingStats || {};
        
        log(`Meeting stats:`, 'info');
        log(`Total meetings: ${meetingStats.total || 0}`, 'info');
        log(`Scheduled: ${meetingStats.scheduled || 0}`, 'info');
        log(`Completed: ${meetingStats.completed || 0}`, 'info');
        log(`Canceled: ${meetingStats.canceled || 0}`, 'info');
        
        if (!meetingStats.total || meetingStats.total === 0) {
          log(`No meeting stats found for ${range.label}`, 'warning');
        }
      } else {
        log(`API call failed for ${range.label} with status ${response.status}`, 'error');
      }
    } catch (error: any) {
      log(`Error testing ${range.label}: ${error.message}`, 'error');
      if (error.response) {
        log(`Status: ${error.response.status}`, 'error');
        log(`Response: ${JSON.stringify(error.response.data, null, 2)}`, 'error');
      }
    }
    
    hr();
  }
}

// Access the database directly to check meeting counts
async function checkMeetingData() {
  log('Checking direct database query for meeting data...', 'info');
  
  try {
    // This would require direct DB access, in a test script we'll
    // just log that this step would be performed
    log('In a full implementation, this would query the database directly to verify meeting counts', 'info');
    log('For the current test script, we\'ll focus on API responses', 'info');
  } catch (error: any) {
    log(`Error checking meeting data directly: ${error.message}`, 'error');
  }
}

// Main test function
async function runTests() {
  log('Starting call data tests', 'info');
  hr();
  
  await testDashboardAPI();
  await testAttributionAPI();
  await checkMeetingData();
  
  log('Tests completed', 'success');
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});