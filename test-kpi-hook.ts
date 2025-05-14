/**
 * KPI Configuration Hook API Test
 * 
 * This script tests the KPI configuration API endpoints used by the hook.
 * It verifies that the API returns the expected data structure.
 */
import axios from 'axios';
import chalk from 'chalk';

// Configuration
const API_BASE_URL = 'http://localhost:5000/api/settings';
const REQUEST_TIMEOUT = 5000; // 5 second timeout

// Define data types (simplified from the actual schema)
interface KpiFormula {
  id: number;
  name: string;
  formula: string;
  description?: string;
  isActive?: boolean;
  categoryId: number;
}

interface KpiCategory {
  id: number;
  name: string;
  description?: string;
  kpis: KpiFormula[];
}

interface CustomField {
  id: number;
  name: string;
  key: string;
  source: string;
  dataType: string;
}

interface AvailableFieldsResponse {
  fields: string[];
  customFields: CustomField[];
}

// Define tests
const TESTS = [
  {
    name: 'KPI Configuration Endpoint',
    path: '/kpi-configuration',
    validation: (data: KpiCategory[]) => {
      if (!Array.isArray(data)) throw new Error('Response is not an array');
      if (data.length === 0) throw new Error('No KPI categories returned');
      
      // Check first category structure
      const category = data[0];
      if (!category.id) throw new Error('Category missing id');
      if (!category.name) throw new Error('Category missing name');
      if (!Array.isArray(category.kpis)) throw new Error('Category missing kpis array');
      
      // If there are KPIs, check their structure
      if (category.kpis.length > 0) {
        const kpi = category.kpis[0];
        if (!kpi.id) throw new Error('KPI missing id');
        if (!kpi.name) throw new Error('KPI missing name');
        if (!kpi.formula) throw new Error('KPI missing formula');
      }
      
      return true;
    }
  },
  {
    name: 'Available Fields Endpoint',
    path: '/available-fields',
    validation: (data: AvailableFieldsResponse) => {
      if (!data.fields) throw new Error('Missing fields array');
      if (!Array.isArray(data.fields)) throw new Error('Fields is not an array');
      
      if (!data.customFields) throw new Error('Missing customFields array');
      if (!Array.isArray(data.customFields)) throw new Error('CustomFields is not an array');
      
      // If there are custom fields, check their structure
      if (data.customFields.length > 0) {
        const field = data.customFields[0];
        if (!field.id) throw new Error('Custom field missing id');
        if (!field.name) throw new Error('Custom field missing name');
        if (!field.key) throw new Error('Custom field missing key');
        if (!field.source) throw new Error('Custom field missing source');
      }
      
      return true;
    }
  }
];

// Utility function for creating a horizontal line
function hr() {
  console.log(chalk.gray('─'.repeat(80)));
}

// Test a single endpoint
async function testEndpoint(test: typeof TESTS[0]) {
  process.stdout.write(chalk.yellow(`Testing ${test.name}... `));
  
  try {
    const url = `${API_BASE_URL}${test.path}`;
    const response = await axios.get(url, {
      timeout: REQUEST_TIMEOUT,
      validateStatus: () => true // Don't throw on non-2xx responses
    });
    
    // Check status code
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    // If we have a validation function, run it
    if (test.validation) {
      test.validation(response.data);
    }
    
    // Log success
    console.log(chalk.green('✓ PASSED'));
    
    // Show summary of the data
    const summary = summarizeData(test.path, response.data);
    if (summary) {
      console.log(chalk.gray(summary));
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
  console.log(chalk.blue.bold('\n📊 KPI CONFIGURATION HOOK API TEST SUITE'));
  hr();
  
  let passed = 0;
  
  for (const test of TESTS) {
    const success = await testEndpoint(test);
    if (success) passed++;
    hr();
  }
  
  // Print summary
  console.log(chalk.blue.bold('\n📋 TEST SUMMARY'));
  console.log(chalk.green(`✓ Passed: ${passed}/${TESTS.length}`));
  console.log(chalk.red(`✗ Failed: ${TESTS.length - passed}/${TESTS.length}`));
  console.log(chalk.gray(`Success rate: ${Math.round((passed / TESTS.length) * 100)}%`));
  
  return passed === TESTS.length;
}

// Helper to summarize data for display
function summarizeData(path: string, data: any): string {
  if (path === '/kpi-configuration' && Array.isArray(data)) {
    const categoryCount = data.length;
    const kpiCount = data.reduce((count, category) => count + category.kpis.length, 0);
    const activeKpis = data.reduce((count, category) => 
      count + category.kpis.filter(kpi => kpi.isActive).length, 0);
    
    return [
      `Found ${categoryCount} KPI categories`,
      `Found ${kpiCount} total KPI formulas`,
      `${activeKpis} active KPIs`
    ].join('\n');
  }
  
  if (path === '/available-fields' && data) {
    return [
      `Found ${data.fields?.length || 0} standard fields`,
      `Found ${data.customFields?.length || 0} custom fields`
    ].join('\n');
  }
  
  return '';
}

// Run the tests
runTests()
  .then(success => {
    if (!success) {
      console.log(chalk.yellow('\n⚠️ Some tests failed. Please check the KPI configuration API endpoints.'));
      process.exit(1);
    } else {
      console.log(chalk.green('\n🎉 All tests passed! The KPI configuration API is working correctly.'));
    }
  })
  .catch(error => {
    console.error(chalk.red('\n❌ An unexpected error occurred:'), error);
    process.exit(1);
  });