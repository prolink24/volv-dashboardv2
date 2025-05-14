import { test, expect } from '@playwright/test';

/**
 * Test the performance of an API endpoint
 * @param url The URL to test
 * @param maxResponseTime The maximum allowed response time in milliseconds
 */
export async function testApiPerformance(url: string, maxResponseTime: number = 3000) {
  const startTime = Date.now();
  const response = await fetch(url);
  const endTime = Date.now();
  
  // Check response status
  expect(response.status).toBe(200);
  
  // Check response time
  const responseTime = endTime - startTime;
  console.log(`API ${url} response time: ${responseTime}ms`);
  expect(responseTime).toBeLessThanOrEqual(maxResponseTime);
  
  // Parse the JSON response
  const data = await response.json();
  
  // Ensure the response has a success field set to true
  expect(data.success).toBe(true);
  
  return { responseTime, data };
}

/**
 * Test multiple API endpoints and return their performance metrics
 * @param endpoints Array of API endpoints to test
 * @param maxResponseTime The maximum allowed response time in milliseconds
 */
export async function testMultipleApiEndpoints(
  endpoints: string[],
  maxResponseTime: number = 3000
) {
  const results = [];
  
  for (const endpoint of endpoints) {
    const url = `http://localhost:5000${endpoint}`;
    const { responseTime, data } = await testApiPerformance(url, maxResponseTime);
    
    results.push({
      endpoint,
      responseTime,
      status: 'success',
      dataSize: JSON.stringify(data).length
    });
  }
  
  return results;
}

/**
 * Measure page load time
 * @param page The Playwright page object
 * @param url The URL to navigate to
 * @param selector A selector to wait for to consider the page loaded
 * @param maxLoadTime The maximum allowed load time in milliseconds
 */
export async function measurePageLoadTime(
  page: any,
  url: string,
  selector: string,
  maxLoadTime: number = 5000
) {
  const startTime = Date.now();
  
  // Navigate to the page
  await page.goto(url);
  
  // Wait for the selector to be visible
  await page.waitForSelector(selector, { state: 'visible' });
  
  // Get the end time
  const endTime = Date.now();
  const loadTime = endTime - startTime;
  
  console.log(`Page ${url} load time: ${loadTime}ms`);
  expect(loadTime).toBeLessThanOrEqual(maxLoadTime);
  
  return loadTime;
}