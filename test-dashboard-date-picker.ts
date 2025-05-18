/**
 * Enhanced Dashboard Date Picker Test Script
 * 
 * This script performs comprehensive testing of the dashboard's date filtering functionality
 * by testing various date formats, ranges, and edge cases to ensure robust filtering.
 */

import axios from 'axios';
import chalk from 'chalk';
import * as http from 'http';
import { format, addDays, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';

// Configure logging with colored output
function log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
  const styles = {
    info: chalk.blue,
    success: chalk.green,
    error: chalk.red,
    warning: chalk.yellow
  };
  console.log(styles[type](`[${type.toUpperCase()}] ${message}`));
}

// Format date to YYYY-MM-DD
function formatDateToString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

async function testDateSelection() {
  log('🔍 Starting comprehensive dashboard date picker test...', 'info');
  
  // Create an HttpAgent to keep connections alive
  const agent = new http.Agent({ keepAlive: true });
  
  // Get the server port from environment or default to 5000
  const PORT = process.env.PORT || 5000;
  const BASE_URL = `http://localhost:${PORT}`;
  
  // Test scenarios for different date formats and ranges
  const today = new Date();
  
  // 1. Test individual dates with 'date' parameter
  const individualDates = [
    today, 
    subDays(today, 1),  // Yesterday
    subDays(today, 7),  // A week ago
    subDays(today, 30)  // A month ago
  ];
  
  // 2. Test date ranges with 'dateRange' parameter (YYYY-MM-DD_YYYY-MM-DD format)
  const dateRanges = [
    // Today only
    {
      label: 'Today only',
      range: `${formatDateToString(today)}_${formatDateToString(today)}`
    },
    // Last 7 days
    {
      label: 'Last 7 days',
      range: `${formatDateToString(subDays(today, 6))}_${formatDateToString(today)}`
    },
    // Last 30 days
    {
      label: 'Last 30 days',
      range: `${formatDateToString(subDays(today, 29))}_${formatDateToString(today)}`
    },
    // This month
    {
      label: 'This month',
      range: `${formatDateToString(startOfMonth(today))}_${formatDateToString(endOfMonth(today))}`
    },
    // Last month
    {
      label: 'Last month',
      range: `${formatDateToString(startOfMonth(subMonths(today, 1)))}_${formatDateToString(endOfMonth(subMonths(today, 1)))}`
    }
  ];
  
  // 3. Test with separate startDate and endDate parameters
  const dateRangePairs = [
    {
      label: 'Last week',
      startDate: formatDateToString(subDays(today, 7)),
      endDate: formatDateToString(today)
    },
    {
      label: 'Last quarter (3 months)',
      startDate: formatDateToString(subMonths(today, 3)),
      endDate: formatDateToString(today)
    }
  ];
  
  // 4. Test edge cases
  const edgeCases = [
    {
      label: 'Future date (should default to today)',
      dateRange: `${formatDateToString(addDays(today, 10))}_${formatDateToString(addDays(today, 20))}`
    },
    {
      label: 'Very old date (data might be sparse)',
      dateRange: `2020-01-01_2020-01-31`
    },
    {
      label: 'Reversed range (start > end, should handle gracefully)',
      dateRange: `${formatDateToString(today)}_${formatDateToString(subDays(today, 30))}`
    }
  ];

  let allTestsPassed = true;
  let testResults = {
    individualDates: 0,
    dateRanges: 0,
    dateRangePairs: 0,
    edgeCases: 0
  };
  
  // Test 1: Individual dates
  log('\n📅 Testing individual dates with "date" parameter...', 'info');
  for (const date of individualDates) {
    const formattedDate = date.toISOString();
    log(`Testing date: ${formattedDate}`, 'info');
    
    try {
      const requestUrl = `${BASE_URL}/api/enhanced-dashboard?date=${encodeURIComponent(formattedDate)}`;
      log(`Making request to: ${requestUrl}`, 'info');
      
      const response = await axios.get(requestUrl, { 
        httpAgent: agent,
        timeout: 20000 // 20 second timeout
      });
      
      if (response.status === 200 && response.data) {
        log(`✓ Dashboard data retrieved successfully for ${format(date, 'MMM d, yyyy')}`, 'success');
        testResults.individualDates++;
        
        // Validate response structure contains expected data
        const dataValidation = validateDashboardData(response.data);
        if (!dataValidation.success) {
          log(`  ✗ ${dataValidation.message}`, 'warning');
          allTestsPassed = false;
        }
      } else {
        log(`✗ Failed to retrieve dashboard data for ${formattedDate}`, 'error');
        log(`Status: ${response.status}`, 'error');
        allTestsPassed = false;
      }
    } catch (error) {
      log(`✗ Error fetching dashboard data for ${formattedDate}`, 'error');
      if (error.response) {
        log(`Status: ${error.response.status}`, 'error');
        log(`Error: ${JSON.stringify(error.response.data)}`, 'error');
      } else {
        log(`Error: ${error.message}`, 'error');
      }
      allTestsPassed = false;
    }
    
    // Add a short delay between requests
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  // Test 2: Date ranges
  log('\n📅 Testing date ranges with "dateRange" parameter...', 'info');
  for (const dateRange of dateRanges) {
    log(`Testing date range: ${dateRange.label} (${dateRange.range})`, 'info');
    
    try {
      const requestUrl = `${BASE_URL}/api/enhanced-dashboard?dateRange=${encodeURIComponent(dateRange.range)}`;
      log(`Making request to: ${requestUrl}`, 'info');
      
      const response = await axios.get(requestUrl, { 
        httpAgent: agent,
        timeout: 20000
      });
      
      if (response.status === 200 && response.data) {
        log(`✓ Dashboard data retrieved successfully for range: ${dateRange.label}`, 'success');
        testResults.dateRanges++;
        
        // Validate response
        const dataValidation = validateDashboardData(response.data);
        if (!dataValidation.success) {
          log(`  ✗ ${dataValidation.message}`, 'warning');
          allTestsPassed = false;
        }
      } else {
        log(`✗ Failed to retrieve dashboard data for range: ${dateRange.label}`, 'error');
        log(`Status: ${response.status}`, 'error');
        allTestsPassed = false;
      }
    } catch (error) {
      log(`✗ Error fetching dashboard data for range: ${dateRange.label}`, 'error');
      if (error.response) {
        log(`Status: ${error.response.status}`, 'error');
        log(`Error: ${JSON.stringify(error.response.data)}`, 'error');
      } else {
        log(`Error: ${error.message}`, 'error');
      }
      allTestsPassed = false;
    }
    
    // Add a short delay between requests
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  // Test 3: Date range pairs
  log('\n📅 Testing with separate startDate and endDate parameters...', 'info');
  for (const dateRangePair of dateRangePairs) {
    log(`Testing date range: ${dateRangePair.label} (${dateRangePair.startDate} to ${dateRangePair.endDate})`, 'info');
    
    try {
      const requestUrl = `${BASE_URL}/api/enhanced-dashboard?startDate=${encodeURIComponent(dateRangePair.startDate)}&endDate=${encodeURIComponent(dateRangePair.endDate)}`;
      log(`Making request to: ${requestUrl}`, 'info');
      
      const response = await axios.get(requestUrl, { 
        httpAgent: agent,
        timeout: 20000
      });
      
      if (response.status === 200 && response.data) {
        log(`✓ Dashboard data retrieved successfully for range: ${dateRangePair.label}`, 'success');
        testResults.dateRangePairs++;
        
        // Validate response
        const dataValidation = validateDashboardData(response.data);
        if (!dataValidation.success) {
          log(`  ✗ ${dataValidation.message}`, 'warning');
          allTestsPassed = false;
        }
      } else {
        log(`✗ Failed to retrieve dashboard data for range: ${dateRangePair.label}`, 'error');
        log(`Status: ${response.status}`, 'error');
        allTestsPassed = false;
      }
    } catch (error) {
      log(`✗ Error fetching dashboard data for range: ${dateRangePair.label}`, 'error');
      if (error.response) {
        log(`Status: ${error.response.status}`, 'error');
        log(`Error: ${JSON.stringify(error.response.data)}`, 'error');
      } else {
        log(`Error: ${error.message}`, 'error');
      }
      allTestsPassed = false;
    }
    
    // Add a short delay between requests
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  // Test 4: Edge cases
  log('\n📅 Testing edge cases...', 'info');
  for (const edgeCase of edgeCases) {
    log(`Testing edge case: ${edgeCase.label}`, 'info');
    
    try {
      const requestUrl = `${BASE_URL}/api/enhanced-dashboard?dateRange=${encodeURIComponent(edgeCase.dateRange)}`;
      log(`Making request to: ${requestUrl}`, 'info');
      
      const response = await axios.get(requestUrl, { 
        httpAgent: agent,
        timeout: 20000
      });
      
      // For edge cases, we just want to make sure the API doesn't crash
      if (response.status === 200) {
        log(`✓ API handled edge case successfully: ${edgeCase.label}`, 'success');
        testResults.edgeCases++;
      } else {
        log(`✗ API failed to handle edge case: ${edgeCase.label}`, 'error');
        log(`Status: ${response.status}`, 'error');
        allTestsPassed = false;
      }
    } catch (error) {
      log(`✗ Error with edge case: ${edgeCase.label}`, 'error');
      if (error.response) {
        log(`Status: ${error.response.status}`, 'error');
        log(`Error: ${JSON.stringify(error.response.data)}`, 'error');
      } else {
        log(`Error: ${error.message}`, 'error');
      }
      allTestsPassed = false;
    }
    
    // Add a short delay between requests
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  // Summary
  log('\n📊 Test Summary:', 'info');
  log(`Individual date tests: ${testResults.individualDates}/${individualDates.length} passed`, testResults.individualDates === individualDates.length ? 'success' : 'warning');
  log(`Date range tests: ${testResults.dateRanges}/${dateRanges.length} passed`, testResults.dateRanges === dateRanges.length ? 'success' : 'warning');
  log(`Date range pair tests: ${testResults.dateRangePairs}/${dateRangePairs.length} passed`, testResults.dateRangePairs === dateRangePairs.length ? 'success' : 'warning');
  log(`Edge case tests: ${testResults.edgeCases}/${edgeCases.length} passed`, testResults.edgeCases === edgeCases.length ? 'success' : 'warning');
  
  if (allTestsPassed) {
    log('✅ All date picker tests passed!', 'success');
  } else {
    log('❌ Some date picker tests failed. See logs for details.', 'error');
  }
  
  return {
    success: allTestsPassed,
    results: testResults,
    totalTests: individualDates.length + dateRanges.length + dateRangePairs.length + edgeCases.length,
    passedTests: testResults.individualDates + testResults.dateRanges + testResults.dateRangePairs + testResults.edgeCases
  };
}

// Helper function to validate dashboard data structure
function validateDashboardData(data: any) {
  // Check for key dashboard components
  const expectedComponents = [
    { name: 'KPIs', field: 'kpis' },
    { name: 'Sales Team', field: 'salesTeam' },
    { name: 'Triage Metrics', field: 'triageMetrics' },
    { name: 'Lead Metrics', field: 'leadMetrics' },
    { name: 'Advanced Metrics', field: 'advancedMetrics' },
    { name: 'Attribution', field: 'attribution' }
  ];
  
  let missingComponents: string[] = [];
  
  for (const component of expectedComponents) {
    if (!data[component.field]) {
      missingComponents.push(component.name);
    }
  }
  
  if (missingComponents.length > 0) {
    return {
      success: false,
      message: `Missing data components: ${missingComponents.join(', ')}`
    };
  }
  
  return { success: true };
}

// Run the test
testDateSelection().catch(error => {
  log(`Unhandled error in test: ${error.message}`, 'error');
  process.exit(1);
});