/**
 * Simple API Test Runner
 * 
 * This script tests the API endpoints directly without using Playwright
 * It's optimized for running in Replit's environment
 */
import axios from 'axios';
import chalk from 'chalk';

// Base URL for API requests
const BASE_URL = 'http://localhost:5000';

// Color formatting for output
const colorMap = {
  success: chalk.green,
  error: chalk.red,
  info: chalk.blue,
  warning: chalk.yellow
};

/**
 * Main function to run all tests
 */
async function runTests() {
  console.log(colorMap.info('======================================'));
  console.log(colorMap.info('    API Test Runner Starting'));
  console.log(colorMap.info('======================================'));
  
  const testCases = [
    {
      name: 'Enhanced Dashboard Data',
      endpoint: '/api/enhanced-dashboard',
      validate: (data) => {
        // Check for expected dashboard structure
        if (!data) return false;
        
        // If attribution section exists, validate it has expected properties
        if (data.attribution) {
          if (!data.attribution.summary) {
            console.log(colorMap.warning('No summary in attribution section.'));
          }
        }
        
        return true;
      }
    },
    {
      name: 'Enhanced Attribution Stats',
      endpoint: '/api/attribution/enhanced-stats',
      validate: (data) => {
        if (!data || !data.success) return false;
        if (typeof data.attributionAccuracy !== 'number') return false;
        if (!data.stats) return false;
        
        return data.attributionAccuracy >= 90;
      }
    },
    {
      name: 'Paginated Contacts',
      endpoint: '/api/contacts?limit=10&offset=0',
      validate: (data) => {
        if (!data || !data.contacts || !Array.isArray(data.contacts)) return false;
        if (typeof data.totalCount !== 'number') return false;
        
        return true;
      }
    },
    {
      name: 'Contact Details',
      endpoint: '/api/contacts/1',
      validate: (data) => {
        if (!data) return false;
        
        // Contact could be directly in data or in a contact property
        const contact = data.contact || data;
        if (!contact.id) return false;
        
        return true;
      }
    },
    {
      name: 'KPI Configuration',
      endpoint: '/api/settings/kpi-configuration',
      validate: (data) => {
        if (!data) return false;
        
        // Categories could be the array itself or nested in categories property
        const categories = Array.isArray(data) ? data : data.categories;
        
        if (!Array.isArray(categories) || categories.length === 0) return false;
        
        // Check first category
        const category = categories[0];
        if (!category.id || !category.name) return false;
        
        return true;
      }
    },
    {
      name: 'Close CRM Users',
      endpoint: '/api/close-users',
      validate: (data) => {
        if (!data) return false;
        
        // Users could be directly the array or in a users property
        const users = Array.isArray(data) ? data : data.users;
        
        if (!Array.isArray(users)) return false;
        
        return true;
      }
    }
  ];
  
  const results = {
    passed: 0,
    failed: 0,
    total: testCases.length,
    startTime: Date.now(),
    tests: []
  };
  
  for (const test of testCases) {
    try {
      console.log(`\nRunning test: ${colorMap.info(test.name)}`);
      console.log(`Endpoint: ${test.endpoint}`);
      
      const response = await axios.get(`${BASE_URL}${test.endpoint}`);
      const data = response.data;
      
      const valid = test.validate(data);
      
      if (valid) {
        console.log(colorMap.success(`✓ ${test.name} passed!`));
        results.passed++;
        results.tests.push({
          name: test.name,
          endpoint: test.endpoint,
          status: 'passed',
          statusCode: response.status
        });
      } else {
        console.log(colorMap.error(`✗ ${test.name} failed validation.`));
        results.failed++;
        results.tests.push({
          name: test.name,
          endpoint: test.endpoint,
          status: 'failed',
          statusCode: response.status,
          reason: 'Failed validation'
        });
      }
    } catch (error) {
      console.log(colorMap.error(`✗ ${test.name} error: ${error.message}`));
      
      let responseData = null;
      let statusCode = 0;
      
      if (error.response) {
        statusCode = error.response.status;
        responseData = error.response.data;
        console.log(`Status: ${statusCode}`);
        console.log(`Response: ${JSON.stringify(responseData).substring(0, 100)}...`);
      }
      
      results.failed++;
      results.tests.push({
        name: test.name,
        endpoint: test.endpoint,
        status: 'error',
        statusCode,
        reason: error.message
      });
    }
  }
  
  // Calculate total test time
  results.totalTime = Date.now() - results.startTime;
  
  // Print summary
  console.log('\n======================================');
  console.log(' Test Results Summary');
  console.log('======================================');
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${colorMap.success(results.passed)}`);
  console.log(`Failed: ${colorMap.error(results.failed)}`);
  console.log(`Total Time: ${results.totalTime}ms`);
  console.log('======================================');
  
  return results;
}

// Run the tests and handle any uncaught errors
runTests()
  .then(results => {
    // Exit with appropriate status code based on test results
    process.exit(results.failed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error(colorMap.error('Uncaught error in test runner:'));
    console.error(error);
    process.exit(1);
  });