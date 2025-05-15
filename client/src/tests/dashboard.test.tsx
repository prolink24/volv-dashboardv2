/**
 * Dashboard Component Tests
 * 
 * These tests help identify issues with the Dashboard component,
 * particularly related to handling undefined values and array operations.
 */

import React from 'react';
import { DashboardDebugWrapper } from '@/components/debug/dashboard-debug-wrapper';
import { AttributionStatsDebug } from '@/components/debug/attribution-stats-debug';
import { safeMap, instrumentedMap, createComponentLogger } from '@/utils/debug-logger';

const logger = createComponentLogger('DashboardTests');

/**
 * Test the safety of our map operations
 */
export function testSafeMapOperations() {
  console.log('======== TESTING SAFE MAP OPERATIONS ========');
  
  // Test with undefined
  try {
    const result1 = safeMap(undefined, (item) => item);
    console.log('safeMap with undefined:', result1);
  } catch (error) {
    console.error('safeMap with undefined threw error:', error);
  }
  
  // Test with null
  try {
    const result2 = safeMap(null, (item) => item);
    console.log('safeMap with null:', result2);
  } catch (error) {
    console.error('safeMap with null threw error:', error);
  }
  
  // Test with empty array
  try {
    const result3 = safeMap([], (item) => item);
    console.log('safeMap with empty array:', result3);
  } catch (error) {
    console.error('safeMap with empty array threw error:', error);
  }
  
  // Test with normal array
  try {
    const result4 = safeMap([1, 2, 3], (item) => item * 2);
    console.log('safeMap with normal array:', result4);
  } catch (error) {
    console.error('safeMap with normal array threw error:', error);
  }
  
  // Test instrumentedMap
  try {
    const result5 = instrumentedMap('TestComponent', 'testArray', undefined, (item) => item);
    console.log('instrumentedMap with undefined:', result5);
  } catch (error) {
    console.error('instrumentedMap with undefined threw error:', error);
  }
  
  console.log('============================================');
}

/**
 * Test the dashboard debug wrapper with various data structures
 */
export function testDashboardDebugWrapper() {
  console.log('======== TESTING DASHBOARD DEBUG WRAPPER ========');
  
  // Test with undefined data
  try {
    const wrapper1 = <DashboardDebugWrapper dashboardData={undefined}>Child content</DashboardDebugWrapper>;
    console.log('Debug wrapper with undefined data created successfully');
  } catch (error) {
    console.error('Debug wrapper with undefined data threw error:', error);
  }
  
  // Test with null data
  try {
    const wrapper2 = <DashboardDebugWrapper dashboardData={null}>Child content</DashboardDebugWrapper>;
    console.log('Debug wrapper with null data created successfully');
  } catch (error) {
    console.error('Debug wrapper with null data threw error:', error);
  }
  
  // Test with empty object
  try {
    const wrapper3 = <DashboardDebugWrapper dashboardData={{}}>Child content</DashboardDebugWrapper>;
    console.log('Debug wrapper with empty object created successfully');
  } catch (error) {
    console.error('Debug wrapper with empty object threw error:', error);
  }
  
  // Test with partial data
  try {
    const wrapper4 = <DashboardDebugWrapper dashboardData={{ salesTeam: undefined }}>Child content</DashboardDebugWrapper>;
    console.log('Debug wrapper with partial data created successfully');
  } catch (error) {
    console.error('Debug wrapper with partial data threw error:', error);
  }
  
  console.log('=================================================');
}

/**
 * Run all tests
 */
export function runDashboardTests() {
  try {
    console.log('Running dashboard tests...');
    testSafeMapOperations();
    testDashboardDebugWrapper();
    console.log('All tests completed');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}