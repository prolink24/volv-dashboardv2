/**
 * Dashboard API Debugging Tool
 * 
 * This script tests all the API endpoints used by the dashboard and logs
 * detailed information about any errors encountered.
 */

import axios from 'axios';
import chalk from 'chalk';
import { db, pool } from './server/db';
import { count } from 'drizzle-orm';
import { 
  contacts, 
  deals, 
  activities, 
  meetings, 
  closeUsers, 
  contactToUserAssignments, 
  dealToUserAssignments 
} from './shared/schema';

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const DEBUG_LEVEL = 'verbose'; // 'basic', 'verbose', 'full'

// Utility function for logging
function log(message: string, type: 'info' | 'success' | 'warning' | 'error' | 'debug' = 'info') {
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
    case 'debug':
      console.log(chalk.gray(`[${timestamp}] • ${message}`));
      break;
    default:
      console.log(chalk.blue(`[${timestamp}] - ${message}`));
  }
}

// Function to verify database tables
async function verifyDatabaseTables() {
  log('Verifying database tables...', 'info');
  
  try {
    // Check contacts table
    const contactsCount = await db.select({ count: count() }).from(contacts);
    log(`Contacts table: ${contactsCount[0].count} records`, 'success');
    
    // Check deals table
    const dealsCount = await db.select({ count: count() }).from(deals);
    log(`Deals table: ${dealsCount[0].count} records`, 'success');
    
    // Check activities table
    const activitiesCount = await db.select({ count: count() }).from(activities);
    log(`Activities table: ${activitiesCount[0].count} records`, 'success');
    
    // Check meetings table
    const meetingsCount = await db.select({ count: count() }).from(meetings);
    log(`Meetings table: ${meetingsCount[0].count} records`, 'success');
    
    // Check Close users table
    const closeUsersCount = await db.select({ count: count() }).from(closeUsers);
    log(`Close users table: ${closeUsersCount[0].count} records`, 'success');
    
    // Check contact user assignments table
    const contactAssignmentsCount = await db.select({ count: count() }).from(contactToUserAssignments);
    log(`Contact user assignments table: ${contactAssignmentsCount[0].count} records`, 'success');
    
    // Check deal user assignments table
    const dealAssignmentsCount = await db.select({ count: count() }).from(dealToUserAssignments);
    log(`Deal user assignments table: ${dealAssignmentsCount[0].count} records`, 'success');
    
    return true;
  } catch (error) {
    log(`Error verifying database tables: ${error.message}`, 'error');
    if (DEBUG_LEVEL === 'full') {
      console.error(error);
    }
    return false;
  }
}

// Test single API endpoint
async function testEndpoint(endpoint: string, description: string) {
  try {
    log(`Testing ${description} (${endpoint})...`, 'info');
    
    // Make the API call
    const startTime = Date.now();
    const response = await axios.get(`${API_BASE_URL}${endpoint}`);
    const endTime = Date.now();
    
    // Log success
    log(`✓ ${description}: ${response.status} (${endTime - startTime}ms)`, 'success');
    
    // Log data if in verbose mode
    if (DEBUG_LEVEL === 'verbose' || DEBUG_LEVEL === 'full') {
      if (typeof response.data === 'object') {
        if (Array.isArray(response.data)) {
          log(`  Response: Array with ${response.data.length} items`, 'debug');
        } else {
          const keys = Object.keys(response.data);
          log(`  Response: Object with keys: ${keys.join(', ')}`, 'debug');
        }
      } else {
        log(`  Response: ${response.data}`, 'debug');
      }
    }
    
    // Log full response in full debug mode
    if (DEBUG_LEVEL === 'full') {
      console.log(chalk.gray('Full response data:'));
      console.dir(response.data, { depth: 4, colors: true });
    }
    
    return { success: true, data: response.data };
  } catch (error) {
    // Log error
    log(`✗ ${description} failed: ${error.message}`, 'error');
    
    // Log detailed error info
    if (DEBUG_LEVEL === 'verbose' || DEBUG_LEVEL === 'full') {
      if (error.response) {
        log(`  Status: ${error.response.status}`, 'error');
        log(`  Status Text: ${error.response.statusText}`, 'error');
        log(`  Data: ${JSON.stringify(error.response.data)}`, 'error');
      }
    }
    
    // Log full error in full debug mode
    if (DEBUG_LEVEL === 'full') {
      console.log(chalk.red('Full error:'));
      console.dir(error, { depth: 3, colors: true });
    }
    
    return { success: false, error };
  }
}

// Main function to check the dashboard API
async function debugDashboardApi() {
  log('Starting Dashboard API Debug Tool', 'info');
  
  try {
    // First, verify database tables
    const dbVerified = await verifyDatabaseTables();
    if (!dbVerified) {
      log('Database verification failed, but continuing with API tests', 'warning');
    }
    
    log('\nTesting dashboard API endpoints:', 'info');
    
    // Test general attribution stats endpoint
    const attributionStatsResult = await testEndpoint('/attribution/enhanced-stats', 'Attribution stats');
    
    // Test close users endpoints
    const closeUsersResult = await testEndpoint('/close-users', 'Close users');
    
    if (closeUsersResult.success && closeUsersResult.data && closeUsersResult.data.users && closeUsersResult.data.users.length > 0) {
      // Get a sample user to test user-specific endpoints
      const sampleUser = closeUsersResult.data.users[0];
      log(`Selected sample user for testing: ${sampleUser.email} (ID: ${sampleUser.id})`, 'info');
      
      // Test user-specific endpoints
      await testEndpoint(`/close-users/${sampleUser.id}`, 'Specific Close user');
      await testEndpoint(`/close-users/${sampleUser.id}/contacts`, 'User contacts');
      await testEndpoint(`/close-users/${sampleUser.id}/deals`, 'User deals');
    } else {
      log('No users available to test user-specific endpoints', 'warning');
    }
    
    // Test dashboard data endpoint
    const dashboardResult = await testEndpoint('/dashboard', 'Dashboard data');
    
    // Test contact-related endpoints
    await testEndpoint('/contacts?limit=10', 'Contacts list');
    await testEndpoint('/contacts/count', 'Contacts count');
    
    // Test deal-related endpoints
    await testEndpoint('/deals?limit=10', 'Deals list');
    await testEndpoint('/deals/count', 'Deals count');
    
    // Test meetings-related endpoints
    await testEndpoint('/meetings?limit=10', 'Meetings list');
    await testEndpoint('/meetings/count', 'Meetings count');
    
    // Check if all critical endpoints are working
    if (attributionStatsResult.success && closeUsersResult.success && dashboardResult.success) {
      log('\nAll critical endpoints are working!', 'success');
    } else {
      log('\nSome critical endpoints are failing, dashboard may not work correctly', 'error');
    }
    
    // Advanced testing: check for dashboard UI issues (data format mismatches)
    if (dashboardResult.success && dashboardResult.data) {
      log('\nAnalyzing dashboard data for potential UI issues:', 'info');
      
      const dashboardData = dashboardResult.data;
      
      // Check for missing required data structures
      const requiredKeys = ['kpis', 'salesTeam', 'triageMetrics', 'leadMetrics', 'advancedMetrics'];
      const missingKeys = requiredKeys.filter(key => !dashboardData[key]);
      
      if (missingKeys.length > 0) {
        log(`Missing required dashboard sections: ${missingKeys.join(', ')}`, 'error');
      } else {
        log('All required dashboard sections are present', 'success');
      }
      
      // Check for specific numeric fields being undefined (common cause of UI errors)
      if (dashboardData.kpis) {
        const kpiFields = Object.entries(dashboardData.kpis);
        const undefinedKpis = kpiFields.filter(([key, value]) => value === undefined);
        
        if (undefinedKpis.length > 0) {
          log(`KPI fields with undefined values: ${undefinedKpis.map(([key]) => key).join(', ')}`, 'warning');
        } else {
          log('All KPI fields have defined values', 'success');
        }
      }
      
      // Check sales team data
      if (dashboardData.salesTeam && Array.isArray(dashboardData.salesTeam)) {
        if (dashboardData.salesTeam.length === 0) {
          log('Sales team array is empty, this may cause UI issues', 'warning');
        } else {
          log(`Sales team data contains ${dashboardData.salesTeam.length} entries`, 'success');
          
          // Verify a sample sales team entry
          const sampleEntry = dashboardData.salesTeam[0];
          const requiredTeamFields = ['name', 'id', 'closed', 'cashCollected', 'contractedValue', 'calls'];
          const missingTeamFields = requiredTeamFields.filter(field => sampleEntry[field] === undefined);
          
          if (missingTeamFields.length > 0) {
            log(`Sales team entries missing fields: ${missingTeamFields.join(', ')}`, 'warning');
          }
        }
      }
    }
    
    log('\nAPI testing completed!', 'info');
    
  } catch (error) {
    log(`Unexpected error during testing: ${error.message}`, 'error');
    console.error(error);
  } finally {
    await pool.end();
  }
}

// Run the test
debugDashboardApi();