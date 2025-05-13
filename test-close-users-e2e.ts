/**
 * Close Users End-to-End Test
 * 
 * This script performs an end-to-end test of the Close user integration:
 * 1. Syncs Close users
 * 2. Syncs user-contact assignments
 * 3. Syncs user-deal assignments
 * 4. Fetches and validates the data
 * 5. Reports attribution metrics for Close users
 */

import axios from 'axios';
import chalk from 'chalk';

const API_BASE_URL = 'http://localhost:5000/api';

// Test configuration
const config = {
  retryInterval: 2000, // 2 seconds between retries
  maxRetries: 10,      // Maximum number of retry attempts
};

// Utility function for logging
function log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
  
  switch (type) {
    case 'success':
      console.log(chalk.green(`[${timestamp}] ✓ ${message}`));
      break;
    case 'warning':
      console.log(chalk.yellow(`[${timestamp}] ⚠ ${message}`));
      break;
    case 'error':
      console.log(chalk.red(`[${timestamp}] ✗ ${message}`));
      break;
    default:
      console.log(chalk.blue(`[${timestamp}] - ${message}`));
  }
}

// Utility function to wait for a specified amount of time
async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to wait for data synchronization to complete
async function waitForSync(checkFn: () => Promise<boolean>, message: string): Promise<boolean> {
  let retries = 0;
  
  while (retries < config.maxRetries) {
    try {
      const result = await checkFn();
      if (result) {
        log(`${message} completed successfully`, 'success');
        return true;
      }
      
      log(`Waiting for ${message} to complete (attempt ${retries + 1}/${config.maxRetries})`, 'info');
      await sleep(config.retryInterval);
      retries++;
    } catch (error) {
      log(`Error checking sync status: ${error.message}`, 'error');
      await sleep(config.retryInterval);
      retries++;
    }
  }
  
  log(`${message} did not complete after ${config.maxRetries} attempts`, 'error');
  return false;
}

// Main function to run the E2E test
async function runE2ETest() {
  log('Starting Close Users End-to-End Test', 'info');
  
  try {
    // Step 1: Sync Close users
    log('Step 1: Initiating Close users sync', 'info');
    const syncResponse = await axios.post(`${API_BASE_URL}/sync/close-users`, {
      syncContacts: true,
      syncDeals: true
    });
    
    if (!syncResponse.data.success) {
      log(`Failed to start sync: ${syncResponse.data.message}`, 'error');
      return;
    }
    
    log(`Sync initiated: ${syncResponse.data.message}`, 'success');
    log('Syncing contacts: ' + (syncResponse.data.syncContacts ? 'Yes' : 'No'), 'info');
    log('Syncing deals: ' + (syncResponse.data.syncDeals ? 'Yes' : 'No'), 'info');
    
    // Step 2: Wait for users to be synchronized
    log('Step 2: Waiting for users to be synchronized', 'info');
    
    // Check function for user sync completion
    const checkUserSync = async (): Promise<boolean> => {
      const response = await axios.get(`${API_BASE_URL}/close-users`);
      return response.data.users.length > 0;
    };
    
    const userSyncCompleted = await waitForSync(checkUserSync, 'User synchronization');
    if (!userSyncCompleted) return;
    
    // Step 3: Get all Close users and pick a sample user
    log('Step 3: Fetching all Close users', 'info');
    const usersResponse = await axios.get(`${API_BASE_URL}/close-users`);
    const { users, totalCount } = usersResponse.data;
    
    log(`Retrieved ${users.length} users out of ${totalCount} total`, 'success');
    
    if (users.length === 0) {
      log('No users found, cannot continue', 'error');
      return;
    }
    
    // Find an active user with first and last name
    const sampleUser = users.find(u => 
      u.status === 'active' && u.first_name && u.last_name
    ) || users[0];
    
    log(`Selected user for testing: ${sampleUser.first_name} ${sampleUser.last_name} (${sampleUser.email})`, 'info');
    
    // Step 4: Get all contacts for the selected user
    log(`Step 4: Fetching contacts for user ${sampleUser.id}`, 'info');
    const contactsResponse = await axios.get(`${API_BASE_URL}/close-users/${sampleUser.id}/contacts`);
    const { contacts, totalCount: contactsCount } = contactsResponse.data;
    
    log(`Retrieved ${contacts.length} contacts for user`, 'success');
    
    // Display sample contacts if available
    if (contacts.length > 0) {
      log('Sample contacts:', 'info');
      contacts.slice(0, 3).forEach((contact, i) => {
        log(`  ${i + 1}. ${contact.name} (${contact.email})`, 'info');
      });
    } else {
      log('No contacts found for this user, this may be expected', 'warning');
    }
    
    // Step 5: Get all deals for the selected user
    log(`Step 5: Fetching deals for user ${sampleUser.id}`, 'info');
    const dealsResponse = await axios.get(`${API_BASE_URL}/close-users/${sampleUser.id}/deals`);
    const { deals, totalCount: dealsCount } = dealsResponse.data;
    
    log(`Retrieved ${deals.length} deals for user`, 'success');
    
    // Display sample deals if available
    if (deals.length > 0) {
      log('Sample deals:', 'info');
      deals.slice(0, 3).forEach((deal, i) => {
        log(`  ${i + 1}. ${deal.title} (${deal.status})`, 'info');
      });
    } else {
      log('No deals found for this user, this may be expected', 'warning');
    }
    
    // Step 6: Check for attribution stats if available
    try {
      log('Step 6: Checking attribution statistics', 'info');
      const statsResponse = await axios.get(`${API_BASE_URL}/attribution/enhanced-stats`);
      
      if (statsResponse.data.success) {
        const { attributionCertainty, fieldCoverage } = statsResponse.data;
        
        log(`Attribution certainty: ${attributionCertainty}%`, 'success');
        log(`Field coverage: ${fieldCoverage}%`, 'success');
        
        // Check if attribution meets our target of 90%+
        if (attributionCertainty >= 90) {
          log(`Attribution certainty is above the 90% target: ${attributionCertainty}%`, 'success');
        } else {
          log(`Attribution certainty is below the 90% target: ${attributionCertainty}%`, 'warning');
        }
      } else {
        log('Could not retrieve attribution statistics', 'warning');
      }
    } catch (error) {
      log('Error checking attribution statistics', 'warning');
    }
    
    // Final summary
    log('\nEnd-to-End Test Summary:', 'info');
    log(`Close users synchronized: ${totalCount}`, 'success');
    log(`Contacts for selected user: ${contactsCount || 0}`, 'success');
    log(`Deals for selected user: ${dealsCount || 0}`, 'success');
    
    log('\nClose Users Integration Test Completed Successfully!', 'success');
    
  } catch (error) {
    log(`Test failed: ${error.message}`, 'error');
    if (error.response) {
      log(`API response: ${JSON.stringify(error.response.data)}`, 'error');
    }
  }
}

// Chalk is already installed as a dependency

// Run the E2E test
runE2ETest().catch(error => {
  console.error(chalk.red('Unhandled error running E2E test:'));
  console.error(error);
});