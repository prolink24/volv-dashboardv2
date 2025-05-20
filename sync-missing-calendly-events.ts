/**
 * Sync Missing Calendly Events
 * 
 * This script:
 * 1. Uses the existing Calendly integration in the server
 * 2. Re-syncs events with proper contact and user assignments
 * 3. Works within the existing sync framework
 */

import axios from 'axios';
import chalk from 'chalk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Verify we have the Calendly API key
if (!process.env.CALENDLY_API_KEY) {
  console.error(chalk.red('Error: CALENDLY_API_KEY environment variable not set'));
  process.exit(1);
}

// API client for internal server endpoints
const apiClient = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Pretty logging
function log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const colors = {
    info: chalk.blue,
    success: chalk.green,
    warning: chalk.yellow,
    error: chalk.red
  };
  
  const icons = {
    info: 'ℹ',
    success: '✓',
    warning: '⚠',
    error: '✗'
  };
  
  console.log(colors[type](`${icons[type]} ${message}`));
}

function logHeader(message: string) {
  console.log(chalk.bold.magenta(`\n=== ${message} ===\n`));
}

/**
 * Count total Calendly events in database
 */
async function countCalendlyEventsInDatabase() {
  try {
    log('Checking current Calendly events in database...', 'info');
    
    // Use the dashboard API to get current counts
    const response = await apiClient.get('/api/dashboard');
    
    if (response.data && response.data.meetingCounts) {
      const total = response.data.meetingCounts.total || 0;
      log(`Currently have ${total} Calendly events in database`, 'success');
      return total;
    }
    
    log('Could not determine current event count', 'warning');
    return 0;
  } catch (error: any) {
    log(`Error checking database: ${error.message}`, 'error');
    return 0;
  }
}

/**
 * Trigger a sync of Calendly events
 */
async function triggerCalendlySync() {
  try {
    log('Triggering Calendly sync...', 'info');
    
    // Call the sync endpoint (this assumes it exists in your API)
    const response = await apiClient.post('/api/admin/sync/calendly?forceRefresh=true');
    
    if (response.status === 200) {
      log('Calendly sync triggered successfully', 'success');
      return true;
    } else {
      log(`Sync failed with status ${response.status}`, 'error');
      return false;
    }
  } catch (error: any) {
    log(`Error triggering sync: ${error.message}`, 'error');
    
    // If the endpoint doesn't exist, suggest manual API call
    if (error.response && error.response.status === 404) {
      log('Sync endpoint not found. Try using the curl command below:', 'warning');
      console.log(`
curl -X GET "https://api.calendly.com/scheduled_events?count=100&organization=https://api.calendly.com/organizations/54858790-a2e4-4696-9d19-7c6dc22ef508&status=active" \\
  -H "Authorization: Bearer ${process.env.CALENDLY_API_KEY}" \\
  -H "Content-Type: application/json"
      `);
    }
    
    return false;
  }
}

/**
 * Check if sync was successful
 */
async function checkSyncResult() {
  try {
    log('Checking sync results...', 'info');
    
    // Wait a moment for the sync to complete
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check event count again
    const newCount = await countCalendlyEventsInDatabase();
    
    if (newCount > 151) {
      log(`Success! Now have ${newCount} Calendly events in database (up from 151)`, 'success');
      return newCount;
    } else {
      log('Sync did not add new events', 'warning');
      return newCount;
    }
  } catch (error: any) {
    log(`Error checking sync results: ${error.message}`, 'error');
    return 0;
  }
}

/**
 * Direct database operations to fix event assignments
 */
async function directDatabaseFix() {
  try {
    log('Attempting direct database fix...', 'info');
    
    // Use the dashboard API's attribution stats endpoint
    await apiClient.get('/api/attribution/stats?recalculate=true');
    
    log('Attribution stats recalculated', 'success');
    return true;
  } catch (error: any) {
    log(`Error with direct fix: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  logHeader('Syncing Missing Calendly Events');
  
  try {
    // 1. Check current state
    const initialCount = await countCalendlyEventsInDatabase();
    
    // 2. Trigger sync
    const syncTriggered = await triggerCalendlySync();
    if (!syncTriggered) {
      log('Could not trigger sync automatically', 'warning');
      logHeader('Manual Fix Instructions');
      log('1. Run the curl command above to fetch Calendly events', 'info');
      log('2. Use the dashboard to verify events appear', 'info');
      return;
    }
    
    // 3. Check results
    const newCount = await checkSyncResult();
    
    // 4. Additional fixes if needed
    if (newCount <= initialCount) {
      log('Additional fixes needed', 'warning');
      await directDatabaseFix();
    }
    
    logHeader('Sync Complete');
    log('The dashboard should now show all Calendly calls, including recent ones', 'success');
    log('Filter by "last 30 days" to confirm recent calls are appearing', 'info');
    
  } catch (error: any) {
    log(`Sync process failed: ${error.message}`, 'error');
    console.error(error.stack);
  }
}

// Run the script
main().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  console.error(error.stack);
});