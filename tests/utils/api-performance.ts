import { test, expect, Page, APIRequestContext } from '@playwright/test';

/**
 * Measure the response time of an API endpoint
 * @param request Playwright APIRequestContext object
 * @param url API endpoint URL
 * @param acceptableResponseTime Maximum acceptable response time in ms
 * @returns Response time in milliseconds
 */
export async function measureApiResponseTime(
  request: APIRequestContext, 
  url: string,
  acceptableResponseTime: number = 2000
): Promise<number> {
  const startTime = Date.now();
  const response = await request.get(url);
  const endTime = Date.now();
  
  const responseTime = endTime - startTime;
  
  // Validate the response was successful
  expect(response.status()).toBe(200);
  
  // Validate the response time is acceptable
  expect(responseTime, `API ${url} response time exceeded ${acceptableResponseTime}ms threshold (actual: ${responseTime}ms)`).toBeLessThanOrEqual(
    acceptableResponseTime
  );
  
  return responseTime;
}

/**
 * Test multiple API endpoints for performance
 * @param request Playwright APIRequestContext object
 * @param endpoints Array of endpoint objects with url and acceptable response time
 * @returns Object mapping endpoints to their response times
 */
export async function testMultipleEndpoints(
  request: APIRequestContext,
  endpoints: Array<{url: string, maxResponseTime?: number}>
): Promise<Record<string, number>> {
  const results: Record<string, number> = {};
  
  for (const endpoint of endpoints) {
    const responseTime = await measureApiResponseTime(
      request,
      endpoint.url,
      endpoint.maxResponseTime
    );
    
    results[endpoint.url] = responseTime;
  }
  
  return results;
}

/**
 * Measure client-side rendering performance of a page
 * @param page Playwright page object
 * @param selector Selector for the element to wait for
 * @param acceptableRenderTime Maximum acceptable render time in ms
 * @returns Render time in milliseconds
 */
export async function measureRenderTime(
  page: Page,
  selector: string,
  acceptableRenderTime: number = 5000
): Promise<number> {
  // Navigate to the page and measure time until the selector is visible
  const startTime = Date.now();
  
  // Wait for the selector to be visible
  await page.waitForSelector(selector, { state: 'visible' });
  
  const endTime = Date.now();
  const renderTime = endTime - startTime;
  
  // Validate render time is acceptable
  expect(renderTime, `Rendering time for selector "${selector}" exceeded ${acceptableRenderTime}ms threshold (actual: ${renderTime}ms)`).toBeLessThanOrEqual(
    acceptableRenderTime
  );
  
  return renderTime;
}

/**
 * Create a performance report for multiple API endpoints
 * @param request Playwright APIRequestContext object
 * @param endpoints Array of endpoint objects with url and acceptable response time
 * @param outputToConsole Whether to output results to console
 * @returns Performance report object
 */
export async function createApiPerformanceReport(
  request: APIRequestContext,
  endpoints: Array<{url: string, maxResponseTime?: number, description?: string}>,
  outputToConsole: boolean = false
): Promise<{
  totalEndpoints: number,
  passedEndpoints: number,
  failedEndpoints: number,
  averageResponseTime: number,
  endpointResults: Record<string, {responseTime: number, passed: boolean, description?: string}>
}> {
  const results: Record<string, {responseTime: number, passed: boolean, description?: string}> = {};
  let totalResponseTime = 0;
  let passedEndpoints = 0;
  let failedEndpoints = 0;
  
  for (const endpoint of endpoints) {
    try {
      const responseTime = await measureApiResponseTime(
        request,
        endpoint.url,
        endpoint.maxResponseTime || 2000
      );
      
      results[endpoint.url] = {
        responseTime,
        passed: true,
        description: endpoint.description
      };
      
      totalResponseTime += responseTime;
      passedEndpoints++;
      
      if (outputToConsole) {
        console.log(`✅ ${endpoint.url} - ${responseTime}ms ${endpoint.description ? `(${endpoint.description})` : ''}`);
      }
    } catch (error) {
      failedEndpoints++;
      
      // Extract response time from error message if available
      const timeMatch = String(error).match(/actual: (\d+)ms/);
      const responseTime = timeMatch ? parseInt(timeMatch[1]) : -1;
      
      results[endpoint.url] = {
        responseTime,
        passed: false,
        description: endpoint.description
      };
      
      if (outputToConsole) {
        console.error(`❌ ${endpoint.url} - ${responseTime > 0 ? `${responseTime}ms` : 'Failed'} ${endpoint.description ? `(${endpoint.description})` : ''}`);
      }
    }
  }
  
  const averageResponseTime = passedEndpoints > 0 ? totalResponseTime / passedEndpoints : -1;
  
  if (outputToConsole) {
    console.log(`\nPerformance Report:`);
    console.log(`Total Endpoints: ${endpoints.length}`);
    console.log(`Passed: ${passedEndpoints}`);
    console.log(`Failed: ${failedEndpoints}`);
    console.log(`Average Response Time: ${averageResponseTime.toFixed(2)}ms`);
  }
  
  return {
    totalEndpoints: endpoints.length,
    passedEndpoints,
    failedEndpoints,
    averageResponseTime,
    endpointResults: results
  };
}