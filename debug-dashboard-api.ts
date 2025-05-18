/**
 * Dashboard API Debugging Tool
 * 
 * This script tests all the API endpoints used by the dashboard and logs
 * detailed information about any errors encountered.
 */

import axios from 'axios';
import chalk from 'chalk';
import { getStorage } from './server/storage';
import * as fs from 'fs';
import { format } from 'date-fns';

// Set up colors for better logging
const colors = {
  info: chalk.blue,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  debug: chalk.gray,
  highlight: chalk.cyan,
};

function log(message: string, type: 'info' | 'success' | 'warning' | 'error' | 'debug' = 'info') {
  console.log(colors[type](`[${type.toUpperCase()}] ${message}`));
}

// Create a log file with detailed output
const LOG_FILE = `./debug-output/dashboard-debug-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.log`;

// Ensure the directory exists
if (!fs.existsSync('./debug-output')) {
  fs.mkdirSync('./debug-output', { recursive: true });
}

// Function to append to log file
function appendToLogFile(message: string) {
  fs.appendFileSync(LOG_FILE, message + '\n');
}

async function verifyDatabaseTables() {
  log('Verifying database tables...', 'info');
  
  try {
    // Check deals table
    const deals = await db.query.deals.findMany({
      where: (deals, { and, between, eq }) => and(
        between(deals.date, new Date('2025-04-01'), new Date('2025-04-30')),
        eq(deals.status, 'won')
      )
    });
    
    log(`Found ${deals.length} won deals in April 2025`, 'info');
    appendToLogFile(`DEALS IN APRIL 2025: ${JSON.stringify(deals, null, 2)}`);
    
    // Calculate total deal value and cash collected
    const totalValue = deals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);
    const totalCashCollected = deals.reduce((sum, deal) => sum + Number(deal.cash_collected || 0), 0);
    
    log(`Total deal value: $${totalValue}`, 'highlight');
    log(`Total cash collected: $${totalCashCollected}`, 'highlight');
    
    if (totalValue !== totalCashCollected) {
      log(`Warning: Deal value (${totalValue}) and cash collected (${totalCashCollected}) don't match`, 'warning');
    }
    
    // Log individual deals
    deals.forEach((deal, index) => {
      log(`Deal ${index + 1}: ID=${deal.id}, value=${deal.value}, cash_collected=${deal.cash_collected}`, 'debug');
    });
    
    return { deals, totalValue, totalCashCollected };
  } catch (error: any) {
    log(`Database query error: ${error.message}`, 'error');
    appendToLogFile(`DATABASE ERROR: ${error.stack}`);
    return null;
  }
}

async function testEndpoint(endpoint: string, description: string) {
  log(`Testing ${description} (${endpoint})...`, 'info');
  
  try {
    // Add date range parameters for April 2025
    const params = endpoint.includes('?') ? '&' : '?';
    const dateEndpoint = `${endpoint}${params}dateRange=2025-04-01_2025-04-30`;
    
    // Use axios to make API call
    const start = Date.now();
    const response = await axios.get(`http://localhost:5000${dateEndpoint}`);
    const duration = Date.now() - start;
    
    // Log basic info
    log(`✓ ${description} response received in ${duration}ms`, 'success');
    
    // Log the response data structure
    if (response.data) {
      const keys = Object.keys(response.data);
      log(`Response keys: ${keys.join(', ')}`, 'debug');
      
      // Check for deals data
      if (response.data.deals || response.data.stats?.deals) {
        const deals = response.data.deals || response.data.stats?.deals;
        const totalValue = Array.isArray(deals) ? 
          deals.reduce((sum, deal) => sum + Number(deal.value || 0), 0) : 
          response.data.stats?.revenue || 0;
        
        const totalCashCollected = Array.isArray(deals) ? 
          deals.reduce((sum, deal) => sum + Number(deal.cash_collected || 0), 0) : 
          response.data.stats?.cashCollected || 0;
          
        log(`API Response - Deal value: $${totalValue}`, 'highlight');
        log(`API Response - Cash collected: $${totalCashCollected}`, 'highlight');
      }
      
      // Log full response to file
      appendToLogFile(`${description.toUpperCase()} (${dateEndpoint}) RESPONSE: ${JSON.stringify(response.data, null, 2)}`);
    }
    
    return response.data;
  } catch (error: any) {
    log(`✗ ${description} error: ${error.message}`, 'error');
    
    if (error.response) {
      log(`Status: ${error.response.status}`, 'error');
      log(`Data: ${JSON.stringify(error.response.data)}`, 'error');
      appendToLogFile(`ERROR FOR ${endpoint}: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      appendToLogFile(`ERROR FOR ${endpoint}: ${error.stack}`);
    }
    
    return null;
  }
}

async function checkCacheService() {
  log('Checking cache service...', 'info');
  
  try {
    // Get cache stats
    const response = await axios.get('http://localhost:5000/api/cache/stats');
    log(`Cache service stats: ${JSON.stringify(response.data)}`, 'debug');
    appendToLogFile(`CACHE STATS: ${JSON.stringify(response.data, null, 2)}`);
    
    // Clear cache and check result
    const clearResponse = await axios.post('http://localhost:5000/api/cache/clear');
    log(`Cache clear result: ${JSON.stringify(clearResponse.data)}`, 'success');
    appendToLogFile(`CACHE CLEAR RESULT: ${JSON.stringify(clearResponse.data, null, 2)}`);
    
    return true;
  } catch (error: any) {
    log(`Cache service error: ${error.message}`, 'error');
    appendToLogFile(`CACHE SERVICE ERROR: ${error.stack}`);
    return false;
  }
}

async function debugDashboardApi() {
  log('Starting comprehensive dashboard API debugging...', 'info');
  appendToLogFile(`=== DASHBOARD API DEBUG REPORT - ${new Date().toISOString()} ===`);
  
  // First verify the actual database values
  const dbResults = await verifyDatabaseTables();
  
  // Check cache service and clear it
  await checkCacheService();
  
  // Test all relevant API endpoints
  const mainDashboard = await testEndpoint('/api/enhanced-dashboard', 'Main dashboard');
  const attributionStats = await testEndpoint('/api/attribution/stats', 'Attribution stats');
  const dealsApi = await testEndpoint('/api/deals', 'Deals API');
  
  // Test date filtering explicitly
  const dateFilteredDashboard = await testEndpoint('/api/enhanced-dashboard?dateRange=2025-04-01_2025-04-30', 'Date filtered dashboard');
  
  // Compare database values with API responses
  if (dbResults && mainDashboard) {
    log('Comparing database values with API responses...', 'info');
    
    const dbTotalValue = dbResults.totalValue;
    const apiTotalValue = mainDashboard.stats?.revenue || 0;
    
    const dbCashCollected = dbResults.totalCashCollected;
    const apiCashCollected = mainDashboard.stats?.cashCollected || 0;
    
    if (dbTotalValue !== apiTotalValue) {
      log(`Discrepancy in Revenue: DB=$${dbTotalValue} vs API=$${apiTotalValue}`, 'error');
    } else {
      log('Revenue values match between database and API', 'success');
    }
    
    if (dbCashCollected !== apiCashCollected) {
      log(`Discrepancy in Cash Collected: DB=$${dbCashCollected} vs API=$${apiCashCollected}`, 'error');
    } else {
      log('Cash Collected values match between database and API', 'success');
    }
  }
  
  log(`Debug log written to ${LOG_FILE}`, 'info');
  log('Dashboard API debugging completed', 'success');
}

// Run the debugging
debugDashboardApi()
  .then(() => {
    log('Debugging script completed successfully', 'success');
  })
  .catch(error => {
    log(`Debugging script error: ${error.message}`, 'error');
    appendToLogFile(`SCRIPT ERROR: ${error.stack}`);
  });