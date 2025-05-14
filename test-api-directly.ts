/**
 * API Testing Script
 * 
 * This script tests the API endpoints directly without using Playwright
 * It's optimized for running in Replit's environment
 */
import axios from 'axios';
import chalk from 'chalk';

// Constants
const API_BASE_URL = 'http://localhost:5000';
const TEST_TIMEOUT = 5000; // 5 seconds

interface Test {
  name: string;
  run: () => Promise<void>;
}

// Utility functions
async function makeApiRequest(endpoint: string) {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await axios.get(url, { timeout: TEST_TIMEOUT });
    return { status: response.status, data: response.data };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return { 
        status: error.response?.status || 500, 
        data: error.response?.data || { success: false, error: error.message }
      };
    }
    return { status: 500, data: { success: false, error: String(error) } };
  }
}

async function runTest(test: Test) {
  console.log(chalk.blue(`Running test: ${test.name}`));
  try {
    await test.run();
    console.log(chalk.green(`✓ ${test.name}`));
    return true;
  } catch (error) {
    console.log(chalk.red(`✗ ${test.name}`));
    console.log(chalk.red(`  Error: ${error instanceof Error ? error.message : String(error)}`));
    return false;
  }
}

// Test definitions
const tests: Test[] = [
  {
    name: 'Dashboard Stats API',
    run: async () => {
      const { status, data } = await makeApiRequest('/api/dashboard/stats');
      
      if (status !== 200) {
        throw new Error(`Expected status 200, got ${status}`);
      }
      
      if (!data.success) {
        throw new Error(`API returned error: ${data.error || 'Unknown error'}`);
      }
      
      if (!data.stats) {
        throw new Error('API response missing stats object');
      }
      
      if (typeof data.stats.totalContacts !== 'number') {
        throw new Error('API response missing totalContacts field');
      }
      
      if (typeof data.stats.attributionRate !== 'number') {
        throw new Error('API response missing attributionRate field');
      }
      
      // Project requirement: attribution rate should be above 90%
      if (data.stats.attributionRate < 90) {
        throw new Error(`Attribution rate ${data.stats.attributionRate}% below required 90%`);
      }
      
      console.log(chalk.gray(`  Total Contacts: ${data.stats.totalContacts}`));
      console.log(chalk.gray(`  Attribution Rate: ${data.stats.attributionRate}%`));
    }
  },
  {
    name: 'Attribution Stats API',
    run: async () => {
      const { status, data } = await makeApiRequest('/api/attribution/enhanced-stats');
      
      if (status !== 200) {
        throw new Error(`Expected status 200, got ${status}`);
      }
      
      if (!data.success) {
        throw new Error(`API returned error: ${data.error || 'Unknown error'}`);
      }
      
      if (!data.attribution) {
        throw new Error('API response missing attribution object');
      }
      
      if (!data.attribution.totalSources) {
        throw new Error('API response missing totalSources field');
      }
      
      if (!data.attribution.contactsBySource) {
        throw new Error('API response missing contactsBySource field');
      }
      
      console.log(chalk.gray(`  Total Sources: ${data.attribution.totalSources}`));
      console.log(chalk.gray(`  Top Source: ${Object.keys(data.attribution.contactsBySource)[0] || 'None'}`));
    }
  },
  {
    name: 'Contacts API with Pagination',
    run: async () => {
      const { status, data } = await makeApiRequest('/api/contacts?page=1&limit=10');
      
      if (status !== 200) {
        throw new Error(`Expected status 200, got ${status}`);
      }
      
      if (!data.success) {
        throw new Error(`API returned error: ${data.error || 'Unknown error'}`);
      }
      
      if (!Array.isArray(data.contacts)) {
        throw new Error('API response missing contacts array');
      }
      
      if (!data.pagination) {
        throw new Error('API response missing pagination object');
      }
      
      if (data.pagination.page !== 1) {
        throw new Error(`Expected page 1, got ${data.pagination.page}`);
      }
      
      if (data.pagination.limit !== 10) {
        throw new Error(`Expected limit 10, got ${data.pagination.limit}`);
      }
      
      console.log(chalk.gray(`  Contacts count: ${data.contacts.length}`));
      console.log(chalk.gray(`  Total contacts: ${data.pagination.total}`));
    }
  },
  {
    name: 'Contacts API filtered by source',
    run: async () => {
      // Use Close CRM as the source to filter by
      const source = 'close';
      const { status, data } = await makeApiRequest(`/api/contacts?source=${source}`);
      
      if (status !== 200) {
        throw new Error(`Expected status 200, got ${status}`);
      }
      
      if (!data.success) {
        throw new Error(`API returned error: ${data.error || 'Unknown error'}`);
      }
      
      if (!Array.isArray(data.contacts)) {
        throw new Error('API response missing contacts array');
      }
      
      // Check if at least one contact is returned
      if (data.contacts.length === 0) {
        console.log(chalk.yellow(`  No contacts found with source '${source}'`));
      } else {
        // Verify that all returned contacts have the specified source
        const contactsWithSource = data.contacts.filter(
          (contact: any) => Array.isArray(contact.sources) && contact.sources.includes(source)
        );
        
        if (contactsWithSource.length !== data.contacts.length) {
          throw new Error(`Some contacts are missing the source: ${source}`);
        }
        
        console.log(chalk.gray(`  Contacts with source '${source}': ${contactsWithSource.length}`));
      }
    }
  },
  {
    name: 'Individual Contact API',
    run: async () => {
      // First get a list of contacts to find a valid ID
      const listResponse = await makeApiRequest('/api/contacts?limit=1');
      
      if (listResponse.status !== 200 || !listResponse.data.success) {
        throw new Error('Failed to fetch contact list');
      }
      
      if (!Array.isArray(listResponse.data.contacts) || listResponse.data.contacts.length === 0) {
        console.log(chalk.yellow('  No contacts available for testing individual contact API'));
        return; // Skip this test
      }
      
      const contactId = listResponse.data.contacts[0].id;
      
      // Now get the specific contact
      const { status, data } = await makeApiRequest(`/api/contacts/${contactId}`);
      
      if (status !== 200) {
        throw new Error(`Expected status 200, got ${status}`);
      }
      
      if (!data.success) {
        throw new Error(`API returned error: ${data.error || 'Unknown error'}`);
      }
      
      if (!data.contact) {
        throw new Error('API response missing contact object');
      }
      
      if (data.contact.id !== contactId) {
        throw new Error(`Expected contact ID ${contactId}, got ${data.contact.id}`);
      }
      
      // Check for detailed fields
      const requiredFields = ['name', 'email', 'sources', 'activities', 'meetings', 'deals'];
      for (const field of requiredFields) {
        if (data.contact[field] === undefined) {
          throw new Error(`Contact is missing required field: ${field}`);
        }
      }
      
      console.log(chalk.gray(`  Contact name: ${data.contact.name}`));
      console.log(chalk.gray(`  Sources count: ${Array.isArray(data.contact.sources) ? data.contact.sources.length : 0}`));
    }
  },
  {
    name: 'KPI Configuration API',
    run: async () => {
      const { status, data } = await makeApiRequest('/api/settings/kpi-configuration');
      
      if (status !== 200) {
        throw new Error(`Expected status 200, got ${status}`);
      }
      
      if (!data.success) {
        throw new Error(`API returned error: ${data.error || 'Unknown error'}`);
      }
      
      if (!data.kpiConfig) {
        throw new Error('API response missing kpiConfig object');
      }
      
      if (!Array.isArray(data.kpiConfig.kpis)) {
        throw new Error('API response missing kpis array');
      }
      
      if (!Array.isArray(data.kpiConfig.activeKpis)) {
        throw new Error('API response missing activeKpis array');
      }
      
      console.log(chalk.gray(`  Total KPIs: ${data.kpiConfig.kpis.length}`));
      console.log(chalk.gray(`  Active KPIs: ${data.kpiConfig.activeKpis.length}`));
    }
  },
  {
    name: 'Close CRM Users API',
    run: async () => {
      const { status, data } = await makeApiRequest('/api/users/close');
      
      if (status !== 200) {
        throw new Error(`Expected status 200, got ${status}`);
      }
      
      if (!data.success) {
        throw new Error(`API returned error: ${data.error || 'Unknown error'}`);
      }
      
      if (!Array.isArray(data.users)) {
        throw new Error('API response missing users array');
      }
      
      console.log(chalk.gray(`  Users count: ${data.users.length}`));
      
      if (data.users.length > 0) {
        // Check first user has required fields
        const requiredFields = ['id', 'name', 'email'];
        const user = data.users[0];
        
        for (const field of requiredFields) {
          if (user[field] === undefined) {
            throw new Error(`User is missing required field: ${field}`);
          }
        }
      }
    }
  },
  {
    name: 'Error Handling - Invalid Endpoint',
    run: async () => {
      const { status, data } = await makeApiRequest('/api/nonexistent-endpoint');
      
      if (status !== 404) {
        throw new Error(`Expected status 404, got ${status}`);
      }
      
      if (data.success !== false) {
        throw new Error('API should return success: false for invalid endpoints');
      }
      
      if (!data.error) {
        throw new Error('API response missing error message');
      }
      
      console.log(chalk.gray(`  Error message: ${data.error}`));
    }
  },
  {
    name: 'Error Handling - Invalid Contact ID',
    run: async () => {
      const { status, data } = await makeApiRequest('/api/contacts/999999999');
      
      if (status !== 404) {
        throw new Error(`Expected status 404, got ${status}`);
      }
      
      if (data.success !== false) {
        throw new Error('API should return success: false for invalid contact ID');
      }
      
      if (!data.error) {
        throw new Error('API response missing error message');
      }
      
      console.log(chalk.gray(`  Error message: ${data.error}`));
    }
  },
  {
    name: 'User Metrics API',
    run: async () => {
      // First get a list of users to find a valid ID
      const usersResponse = await makeApiRequest('/api/users/close');
      
      if (usersResponse.status !== 200 || !usersResponse.data.success) {
        throw new Error('Failed to fetch users list');
      }
      
      if (!Array.isArray(usersResponse.data.users) || usersResponse.data.users.length === 0) {
        console.log(chalk.yellow('  No users available for testing user metrics API'));
        return; // Skip this test
      }
      
      const userId = usersResponse.data.users[0].id;
      
      // Now get the metrics for this user
      const { status, data } = await makeApiRequest(`/api/metrics/user/${userId}`);
      
      if (status !== 200) {
        throw new Error(`Expected status 200, got ${status}`);
      }
      
      if (!data.success) {
        throw new Error(`API returned error: ${data.error || 'Unknown error'}`);
      }
      
      if (!data.metrics) {
        throw new Error('API response missing metrics object');
      }
      
      // Check required metrics fields
      const requiredFields = ['totalContacts', 'totalDeals', 'conversionRate', 'performance'];
      for (const field of requiredFields) {
        if (data.metrics[field] === undefined) {
          throw new Error(`Metrics missing required field: ${field}`);
        }
      }
      
      console.log(chalk.gray(`  User contacts: ${data.metrics.totalContacts}`));
      console.log(chalk.gray(`  User deals: ${data.metrics.totalDeals}`));
      console.log(chalk.gray(`  Conversion rate: ${data.metrics.conversionRate}%`));
    }
  }
];

// Main function
async function main() {
  console.log(chalk.blue.bold('====================================='));
  console.log(chalk.blue.bold('      API TESTING SCRIPT'));
  console.log(chalk.blue.bold('====================================='));
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await runTest(test);
    if (result) {
      passed++;
    } else {
      failed++;
    }
    console.log(); // Add a blank line between tests
  }
  
  console.log(chalk.blue.bold('====================================='));
  console.log(chalk.blue.bold('          TEST SUMMARY'));
  console.log(chalk.blue.bold('====================================='));
  console.log(chalk.green(`Tests passed: ${passed}`));
  console.log(chalk.red(`Tests failed: ${failed}`));
  console.log(chalk.blue(`Total tests: ${tests.length}`));
  console.log(chalk.blue.bold('====================================='));
  
  // Return a non-zero exit code if any test failed
  if (failed > 0) {
    process.exit(1);
  }
}

// Run the tests
main().catch(error => {
  console.error(chalk.red('Error running tests:'), error);
  process.exit(1);
});