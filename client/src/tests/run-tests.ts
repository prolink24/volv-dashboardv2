/**
 * Test Runner
 * 
 * This file provides a single entry point to run all tests in the application.
 * It can be imported and called from components to run tests as needed.
 */

import { runDashboardTests } from './dashboard.test';

/**
 * Run all tests in the application
 */
export function runAllTests() {
  console.log('=== STARTING ALL TESTS ===');
  runDashboardTests();
  console.log('=== ALL TESTS COMPLETED ===');
}

/**
 * Run tests on demand for a specific component
 */
export function runSpecificTests(component: 'dashboard') {
  console.log(`=== STARTING ${component.toUpperCase()} TESTS ===`);
  
  switch (component) {
    case 'dashboard':
      runDashboardTests();
      break;
    default:
      console.warn(`No tests found for component: ${component}`);
  }
  
  console.log(`=== ${component.toUpperCase()} TESTS COMPLETED ===`);
}