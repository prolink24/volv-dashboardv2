/**
 * Dashboard Date Picker Test Script
 * 
 * This script tests the dashboard's date picker by making multiple requests
 * with different date selections.
 */

import axios from 'axios';
import chalk from 'chalk';
import * as http from 'http';

function log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
  const styles = {
    info: chalk.blue,
    success: chalk.green,
    error: chalk.red,
    warning: chalk.yellow
  };
  console.log(styles[type](`[${type.toUpperCase()}] ${message}`));
}

async function testDateSelection() {
  log('Starting dashboard date picker test...', 'info');
  
  // Create an HttpAgent to keep connections alive
  const agent = new http.Agent({ keepAlive: true });
  
  // Get the server port from environment or default to 5000
  const PORT = process.env.PORT || 5000;
  const BASE_URL = `http://localhost:${PORT}`;
  
  // Test dates (we'll test current month and a few previous months)
  const today = new Date();
  const testDates = [
    today,
    new Date(today.getFullYear(), today.getMonth() - 1, 1), // Last month
    new Date(today.getFullYear(), today.getMonth() - 2, 1), // 2 months ago
    new Date(today.getFullYear(), today.getMonth() - 3, 1)  // 3 months ago
  ];
  
  let allTestsPassed = true;
  
  for (const date of testDates) {
    const formattedDate = date.toISOString();
    log(`Testing date: ${formattedDate}`, 'info');
    
    try {
      // Make API request with the test date - use full URL
      const requestUrl = `${BASE_URL}/api/enhanced-dashboard?date=${encodeURIComponent(formattedDate)}`;
      log(`Making request to: ${requestUrl}`, 'info');
      
      const response = await axios.get(requestUrl, { 
        httpAgent: agent,
        timeout: 10000 // 10 second timeout
      });
      // Validate response
      if (response.status === 200 && response.data) {
        log(`✓ Dashboard data retrieved successfully for ${formattedDate}`, 'success');
        
        // Check for key dashboard components
        const checks = [
          { name: 'KPIs', exists: !!response.data.kpis },
          { name: 'Sales Team', exists: !!response.data.salesTeam },
          { name: 'Triage Metrics', exists: !!response.data.triageMetrics },
          { name: 'Lead Metrics', exists: !!response.data.leadMetrics },
          { name: 'Advanced Metrics', exists: !!response.data.advancedMetrics },
          { name: 'Attribution', exists: !!response.data.attribution }
        ];
        
        for (const check of checks) {
          if (check.exists) {
            log(`  ✓ ${check.name} data present`, 'success');
          } else {
            log(`  ✗ ${check.name} data missing`, 'warning');
            allTestsPassed = false;
          }
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
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  if (allTestsPassed) {
    log('✅ All date picker tests passed!', 'success');
  } else {
    log('❌ Some date picker tests failed. See logs for details.', 'error');
  }
}

// Run the test
testDateSelection().catch(error => {
  log(`Unhandled error in test: ${error.message}`, 'error');
  process.exit(1);
});