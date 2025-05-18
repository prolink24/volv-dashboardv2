/**
 * Enhanced Dashboard Debugging Script
 * 
 * This script provides detailed logs about the dashboard API data flow
 * to diagnose why cash_collected values are not being updated properly.
 */

import axios from 'axios';
import * as fs from 'fs';
import { format } from 'date-fns';

// Constants
const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}`;
const LOG_DIR = './debug-output';
const LOG_FILE = `${LOG_DIR}/dashboard-debug-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.log`;

// Setup log directory
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Logging functions
function log(message: string, type = 'INFO') {
  const formattedMessage = `[${type}] ${message}`;
  console.log(formattedMessage);
  fs.appendFileSync(LOG_FILE, formattedMessage + '\n');
}

function logObject(label: string, data: any) {
  const dataString = JSON.stringify(data, null, 2);
  log(`${label}:\n${dataString}`, 'DATA');
}

// Query the API with specific date parameters
async function queryAPIWithDate(endpoint: string, description: string) {
  log(`Testing ${description} (${endpoint})`);
  
  try {
    // Add April 2025 date range for consistent testing
    const dateParam = endpoint.includes('?') ? '&' : '?';
    const fullEndpoint = `${BASE_URL}${endpoint}${dateParam}dateRange=2025-04-01_2025-04-30`;
    
    log(`Making request to: ${fullEndpoint}`);
    const response = await axios.get(fullEndpoint);
    log(`✓ ${description} responded with status ${response.status}`);
    
    return response.data;
  } catch (error: any) {
    log(`✗ Error with ${description}: ${error.message}`, 'ERROR');
    if (error.response) {
      log(`Status: ${error.response.status}`, 'ERROR');
      logObject(`Error Response for ${endpoint}`, error.response.data);
    }
    return null;
  }
}

// Analyze the dashboard data
function analyzeDashboardData(data: any) {
  if (!data) {
    log('No dashboard data to analyze', 'WARNING');
    return;
  }
  
  log('Analyzing dashboard data');
  
  // Log basic structure
  const keys = Object.keys(data);
  log(`Dashboard data keys: ${keys.join(', ')}`);
  
  // Check for revenue and cash collected in stats
  if (data.stats) {
    const { revenue, cashCollected } = data.stats;
    log(`Revenue: $${revenue || 0}`);
    log(`Cash Collected: $${cashCollected || 0}`);
    
    if (revenue !== cashCollected && revenue > 0 && cashCollected > 0) {
      log(`Warning: Revenue ($${revenue}) doesn't match Cash Collected ($${cashCollected})`, 'WARNING');
    }
  }
  
  // Check deals data if present
  if (data.deals && Array.isArray(data.deals)) {
    log(`Found ${data.deals.length} deals in response`);
    
    let totalValue = 0;
    let totalCashCollected = 0;
    
    // Log each deal and accumulate values
    data.deals.forEach((deal: any, index: number) => {
      const value = Number(deal.value || 0);
      const cashCollected = Number(deal.cash_collected || 0);
      
      totalValue += value;
      totalCashCollected += cashCollected;
      
      log(`Deal ${index + 1}: ID=${deal.id}, value=$${value}, cash_collected=$${cashCollected}`);
      
      if (value !== cashCollected) {
        log(`Mismatch in deal ${deal.id}: value=$${value}, cash_collected=$${cashCollected}`, 'WARNING');
      }
    });
    
    log(`Total deal values: $${totalValue}`);
    log(`Total cash collected: $${totalCashCollected}`);
    
    // Compare with stats if available
    if (data.stats) {
      const statsRevenue = data.stats.revenue || 0;
      const statsCashCollected = data.stats.cashCollected || 0;
      
      if (totalValue !== statsRevenue) {
        log(`Discrepancy: Calculated total value ($${totalValue}) ≠ stats.revenue ($${statsRevenue})`, 'ERROR');
      }
      
      if (totalCashCollected !== statsCashCollected) {
        log(`Discrepancy: Calculated cash collected ($${totalCashCollected}) ≠ stats.cashCollected ($${statsCashCollected})`, 'ERROR');
      }
    }
  }
  
  // Check for any secondary cached values
  if (data.cachedStats) {
    log('Warning: Found cached stats in response - these might be stale', 'WARNING');
    logObject('Cached Stats', data.cachedStats);
  }
  
  // Check for timestamp to see when data was generated
  if (data.timestamp) {
    const timestamp = new Date(data.timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    log(`Data timestamp: ${timestamp.toISOString()} (${diffInMinutes} minutes ago)`);
    
    if (diffInMinutes > 15) {
      log(`Warning: Data is ${diffInMinutes} minutes old, may be stale cached data`, 'WARNING');
    }
  }
  
  // Save full dashboard data for reference
  fs.writeFileSync(`${LOG_DIR}/dashboard-data-full.json`, JSON.stringify(data, null, 2));
}

// Check direct database access (using API as proxy)
async function queryDatabaseDirectly() {
  log('Querying database directly for deals in April 2025');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/debug/query-deals`, {
      startDate: '2025-04-01',
      endDate: '2025-04-30',
      status: 'won'
    });
    
    const deals = response.data.deals || [];
    log(`Found ${deals.length} won deals in April 2025 directly from database`);
    
    let totalValue = 0;
    let totalCashCollected = 0;
    
    deals.forEach((deal: any) => {
      totalValue += Number(deal.value || 0);
      totalCashCollected += Number(deal.cash_collected || 0);
    });
    
    log(`Direct DB - Total deal value: $${totalValue}`);
    log(`Direct DB - Total cash collected: $${totalCashCollected}`);
    
    logObject('Direct DB Query Results', deals);
    return { deals, totalValue, totalCashCollected };
  } catch (error: any) {
    log(`Error querying database directly: ${error.message}`, 'ERROR');
    return null;
  }
}

// Check and clear cache
async function checkAndClearCache() {
  log('Checking and clearing cache');
  
  try {
    // Check cache stats
    const statsResponse = await axios.get(`${BASE_URL}/api/cache/stats`);
    logObject('Cache Stats', statsResponse.data);
    
    // Clear cache
    const clearResponse = await axios.post(`${BASE_URL}/api/cache/clear`);
    log(`Cache cleared: ${JSON.stringify(clearResponse.data)}`);
    
    return true;
  } catch (error: any) {
    log(`Error with cache operations: ${error.message}`, 'ERROR');
    return false;
  }
}

// Compare two data sources
function compareDataSources(source1: any, source2: any, source1Name: string, source2Name: string) {
  if (!source1 || !source2) {
    log(`Can't compare ${source1Name} and ${source2Name} - missing data`, 'WARNING');
    return;
  }
  
  log(`Comparing ${source1Name} with ${source2Name}`);
  
  // Compare revenue/value
  const value1 = source1.totalValue || source1.revenue || 0;
  const value2 = source2.totalValue || source2.revenue || 0;
  
  if (value1 !== value2) {
    log(`Discrepancy in values: ${source1Name}=$${value1}, ${source2Name}=$${value2}`, 'ERROR');
  } else {
    log(`Values match between ${source1Name} and ${source2Name}: $${value1}`);
  }
  
  // Compare cash collected
  const cash1 = source1.totalCashCollected || source1.cashCollected || 0;
  const cash2 = source2.totalCashCollected || source2.cashCollected || 0;
  
  if (cash1 !== cash2) {
    log(`Discrepancy in cash collected: ${source1Name}=$${cash1}, ${source2Name}=$${cash2}`, 'ERROR');
  } else {
    log(`Cash collected values match between ${source1Name} and ${source2Name}: $${cash1}`);
  }
}

// Add debug endpoint to server
async function addDebugEndpoint() {
  try {
    await axios.post(`${BASE_URL}/api/admin/add-debug-endpoint`, {
      secret: 'debugging-session'
    });
    log('Debug endpoint added successfully');
    return true;
  } catch (error) {
    // Ignore errors, endpoint might already exist
    return false;
  }
}

// Main function
async function runDashboardDebug() {
  log('Starting dashboard debugging session', 'START');
  log(`Logs will be written to: ${LOG_FILE}`);
  
  try {
    // 1. Check cache and clear it
    await checkAndClearCache();
    
    // 2. Query database directly for ground truth
    const dbData = await queryDatabaseDirectly();
    
    // 3. Query dashboard API with date filter
    const dashboardData = await queryAPIWithDate('/api/enhanced-dashboard', 'Dashboard API');
    analyzeDashboardData(dashboardData);
    
    // 4. Compare data sources
    if (dbData && dashboardData) {
      compareDataSources(dbData, dashboardData.stats, 'Database', 'Dashboard API');
    }
    
    // 5. Test attribution stats endpoint separately
    const attributionData = await queryAPIWithDate('/api/attribution/stats', 'Attribution Stats API');
    logObject('Attribution Stats', attributionData);
    
    // 6. Check deals endpoint directly
    const dealsData = await queryAPIWithDate('/api/deals', 'Deals API');
    logObject('Deals API Response', dealsData);
    
    log('Dashboard debugging completed successfully', 'COMPLETE');
    console.log(`\nDebug log written to: ${LOG_FILE}`);
    
  } catch (error: any) {
    log(`Dashboard debugging failed: ${error.message}`, 'ERROR');
    log(error.stack || 'No stack trace available', 'ERROR');
  }
}

// Run the main function
runDashboardDebug();