/**
 * Enhanced API Test Script for Contact Attribution Platform
 * 
 * This script tests the API endpoints of the contact attribution platform
 * without using Playwright, which allows it to run directly against the server.
 */
import axios from 'axios';
import chalk from 'chalk';

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const REQUEST_TIMEOUT = 10000; // 10 second timeout for slow endpoints

// Only testing core endpoints to avoid timeouts
const ENDPOINTS: TestEndpoint[] = [
  {
    name: 'Attribution Stats',
    path: '/attribution/enhanced-stats',
    validation: (data: any) => {
      if (!data.success) throw new Error('API returned success: false');
      if (typeof data.attributionAccuracy !== 'number') throw new Error('Missing attributionAccuracy');
      if (!data.stats) throw new Error('Missing stats object');
      
      // Check that attribution accuracy meets project requirements (>90%)
      if (data.attributionAccuracy < 90) {
        throw new Error(`Attribution accuracy ${data.attributionAccuracy}% below required 90%`);
      }
      
      return true;
    }
  },
  {
    name: 'Contacts API (Paginated)',
    path: '/contacts?page=1&limit=5',
    validation: (data: any) => {
      if (!data.contacts) throw new Error('Missing contacts array');
      if (!Array.isArray(data.contacts)) throw new Error('Contacts is not an array');
      
      // Check first contact has required fields
      if (data.contacts.length > 0) {
        const contact = data.contacts[0];
        if (!contact.id) throw new Error('Contact missing id');
        if (!contact.name) throw new Error('Contact missing name');
        if (!contact.email) throw new Error('Contact missing email');
      }
      
      return true;
    }
  },
  {
    name: 'Enhanced Dashboard Data',
    path: '/enhanced-dashboard?date=2025-03-01T00:00:00.000Z', // Use a fixed date to avoid timeouts
    validation: (data: any) => {
      // Check for data structure
      if (!data) throw new Error('Missing dashboard data');
      
      // If attribution section exists, check it
      if (data.attribution) {
        if (!data.attribution.summary && data.attribution.summary !== null) {
          throw new Error('Dashboard missing attribution.summary');
        }
      }
      
      return true;
    }
  },
  {
    name: 'KPI Configuration',
    path: '/settings/kpi-configuration',
    validation: (data: any) => {
      // Categories could be the array itself or nested in categories property
      const categories = Array.isArray(data) ? data : data.categories;
      
      if (!Array.isArray(categories)) throw new Error('KPI categories is not an array');
      if (categories.length === 0) throw new Error('KPI categories is empty');
      
      // Check first category
      const category = categories[0];
      if (!category.id) throw new Error('KPI category missing id');
      if (!category.name) throw new Error('KPI category missing name');
      
      return true;
    }
  },
  {
    name: 'Close CRM Users',
    path: '/close-users',
    validation: (data: any) => {
      // Users could be directly the array or in a users property
      const users = Array.isArray(data) ? data : data.users;
      
      if (!Array.isArray(users)) throw new Error('Close users is not an array');
      
      // Check first user if available
      if (users.length > 0) {
        const user = users[0];
        if (!user.id) throw new Error('User missing id');
        // Some users might not have name, just check that the property exists
        if (!('name' in user)) throw new Error('User missing name property');
      }
      
      return true;
    }
  }
];

// Utility function for creating a horizontal line
function hr() {
  console.log(chalk.gray('─'.repeat(80)));
}

// Define the endpoint type
interface TestEndpoint {
  name: string;
  path: string;
  validation: (data: any) => boolean;
  expectedStatus?: number;
}

// Test a single endpoint
async function testEndpoint(endpoint: TestEndpoint) {
  process.stdout.write(chalk.yellow(`Testing ${endpoint.name}... `));
  
  try {
    const url = `${API_BASE_URL}${endpoint.path}`;
    const response = await axios.get(url, {
      timeout: REQUEST_TIMEOUT,
      validateStatus: () => true // Don't throw on non-2xx responses
    });
    
    // Check status code
    const expectedStatus = endpoint.expectedStatus || 200;
    if (response.status !== expectedStatus) {
      throw new Error(`Expected status ${expectedStatus}, got ${response.status}`);
    }
    
    // If we have a validation function, run it
    if (endpoint.validation && response.status === 200) {
      endpoint.validation(response.data);
    }
    
    // Log success
    console.log(chalk.green('✓ PASSED'));
    
    // Show summary of the data
    if (response.status === 200) {
      const summary = summarizeData(endpoint.path, response.data);
      if (summary) {
        console.log(chalk.gray(summary));
      }
    }
    
    return true;
  } catch (error) {
    // Log failure
    console.log(chalk.red('✗ FAILED'));
    console.log(chalk.red(`  Error: ${error instanceof Error ? error.message : String(error)}`));
    return false;
  }
}

// Main test function
async function runTests() {
  console.log(chalk.blue.bold('\n📊 CONTACT ATTRIBUTION API TEST SUITE'));
  hr();
  
  let passed = 0;
  
  for (const endpoint of ENDPOINTS) {
    const success = await testEndpoint(endpoint);
    if (success) passed++;
    hr();
  }
  
  // Print summary
  console.log(chalk.blue.bold('\n📋 TEST SUMMARY'));
  console.log(chalk.green(`✓ Passed: ${passed}/${ENDPOINTS.length}`));
  console.log(chalk.red(`✗ Failed: ${ENDPOINTS.length - passed}/${ENDPOINTS.length}`));
  console.log(chalk.gray(`Success rate: ${Math.round((passed / ENDPOINTS.length) * 100)}%`));
  
  return passed === ENDPOINTS.length;
}

// Helper to summarize data for display
function summarizeData(path: string, data: any): string {
  if (path === '/attribution/enhanced-stats' && data.stats) {
    return [
      `Attribution accuracy: ${data.attributionAccuracy.toFixed(2)}%`,
      `Total contacts: ${data.stats.totalContacts}`,
      `High certainty contacts: ${data.stats.highCertaintyContacts}/${data.stats.contactsAnalyzed}`,
      `Multi-source rate: ${data.stats.multiSourceRate}%`,
      `Deal attribution rate: ${(data.stats.dealAttributionRate || 0).toFixed(2)}%`
    ].join('\n');
  }
  
  if (path.startsWith('/contacts') && data.contacts) {
    return `Found ${data.contacts.length} contacts${data.pagination ? ` (Page ${data.pagination.page}/${data.pagination.totalPages})` : ''}`;
  }
  
  if (path === '/enhanced-dashboard') {
    const sources = data.attribution?.sources || [];
    const sourcesCount = sources.length || 0;
    return [
      `Dashboard data retrieved`,
      `Attribution sources: ${sourcesCount}`,
      `Time period: ${data.timePeriod || 'Not specified'}`
    ].join('\n');
  }
  
  if (path === '/settings/kpi-configuration') {
    const categories = Array.isArray(data) ? data : data.categories || [];
    const kpiCount = categories.reduce((count, cat) => {
      return count + (cat.kpis?.length || 0);
    }, 0);
    
    return [
      `KPI Categories: ${categories.length}`,
      `Total KPIs: ${kpiCount}`
    ].join('\n');
  }
  
  if (path === '/close-users') {
    const users = Array.isArray(data) ? data : data.users || [];
    return `Found ${users.length} Close CRM users`;
  }
  
  return '';
}

// Run the tests
runTests()
  .then(success => {
    if (!success) {
      console.log(chalk.yellow('\n⚠️ Some tests failed. Please fix the issues before deploying.'));
      process.exit(1);
    } else {
      console.log(chalk.green('\n🎉 All tests passed! The API is working correctly.'));
    }
  })
  .catch(error => {
    console.error(chalk.red('\n❌ An unexpected error occurred:'), error);
    process.exit(1);
  });