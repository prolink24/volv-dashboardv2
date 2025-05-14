import { Page, Response, request } from '@playwright/test';

/**
 * Measure page load time
 * @param page Playwright page object
 * @param url URL to navigate to
 * @param selector Selector to wait for (indicating page is loaded)
 * @param timeout Maximum time to wait for page load
 * @returns Promise with page load time in milliseconds
 */
export async function measurePageLoadTime(
  page: Page, 
  url: string, 
  selector: string, 
  timeout: number = 30000
): Promise<number> {
  const startTime = Date.now();
  
  // Navigate to the page
  await page.goto(url);
  
  // Wait for the selector to appear (indicating the page is loaded)
  await page.waitForSelector(selector, { timeout });
  
  // For a more accurate measurement, wait for network to be idle
  await page.waitForLoadState('networkidle');
  
  const endTime = Date.now();
  return endTime - startTime;
}

/**
 * Test the performance of multiple API endpoints
 * @param endpoints List of API endpoint URLs to test
 * @param maxResponseTime Maximum acceptable response time in ms
 * @returns Array of test results with performance metrics
 */
export async function testMultipleApiEndpoints(
  endpoints: string[], 
  maxResponseTime: number = 3000
): Promise<ApiEndpointResult[]> {
  const results: ApiEndpointResult[] = [];
  const ctx = await request.newContext();
  
  for (const endpoint of endpoints) {
    const startTime = Date.now();
    const response = await ctx.get(`http://localhost:5000${endpoint}`);
    const endTime = Date.now();
    
    const responseTimeMs = endTime - startTime;
    const status = response.status();
    const success = status >= 200 && status < 300;
    const size = (await response.body()).length;
    
    results.push({
      endpoint,
      status,
      responseTimeMs,
      success,
      withinThreshold: responseTimeMs <= maxResponseTime,
      size
    });
  }
  
  return results;
}

/**
 * Test API performance for a single endpoint
 * @param endpoint API endpoint URL to test
 * @param maxResponseTime Maximum acceptable response time in ms
 * @returns Test result with performance metrics
 */
export async function testApiPerformance(
  endpoint: string,
  maxResponseTime: number = 3000
): Promise<ApiEndpointResult> {
  const results = await testMultipleApiEndpoints([endpoint], maxResponseTime);
  return results[0];
}

/**
 * Interface for API endpoint test results
 */
export interface ApiEndpointResult {
  endpoint: string;
  status: number;
  responseTimeMs: number;
  success: boolean;
  withinThreshold: boolean;
  size: number;
}

/**
 * Original full metrics collection version
 * @param page Playwright page object
 * @returns Promise with page load timing metrics
 */
export async function collectPageMetrics(page: Page): Promise<PageLoadMetrics> {
  // Execute JavaScript in the browser to get performance metrics
  const timing = await page.evaluate(() => {
    const perf = window.performance;
    const perfTiming = perf.timing;
    
    // Calculate key timings
    const navigationStart = perfTiming.navigationStart;
    const responseEnd = perfTiming.responseEnd;
    const domInteractive = perfTiming.domInteractive;
    const domContentLoaded = perfTiming.domContentLoadedEventEnd;
    const loadComplete = perfTiming.loadEventEnd;
    
    // Return metrics
    return {
      totalLoadTime: loadComplete - navigationStart,
      networkLatency: responseEnd - navigationStart,
      domProcessingTime: domInteractive - responseEnd,
      domContentLoadedTime: domContentLoaded - navigationStart,
      renderTime: loadComplete - domContentLoaded,
      networkResources: perf.getEntriesByType('resource').length,
      timestamp: new Date().toISOString()
    };
  });
  
  return timing;
}

/**
 * Measure API response time
 * @param page Playwright page object 
 * @param url API endpoint URL
 * @returns Promise with API response timing metrics
 */
export async function measureApiResponseTime(page: Page, url: string): Promise<ApiResponseMetrics> {
  // Start measuring time
  const startTime = Date.now();
  
  // Create a promise to capture the response
  const responsePromise = page.waitForResponse(url);
  
  // Make the API call (assumes it happens via browser navigation or UI interaction)
  // This can be modified depending on how you want to trigger the API call
  await page.goto(url);
  
  // Wait for response
  const response: Response = await responsePromise;
  const endTime = Date.now();
  
  // Calculate metrics
  const status = response.status();
  const responseSize = (await response.body()).length;
  const totalTime = endTime - startTime;
  
  return {
    url,
    status,
    responseSize,
    totalTime,
    timestamp: new Date().toISOString(),
    success: status >= 200 && status < 300
  };
}

/**
 * Interface for page load metrics
 */
export interface PageLoadMetrics {
  totalLoadTime: number;
  networkLatency: number;
  domProcessingTime: number;
  domContentLoadedTime: number;
  renderTime: number;
  networkResources: number;
  timestamp: string;
}

/**
 * Interface for API response metrics
 */
export interface ApiResponseMetrics {
  url: string;
  status: number;
  responseSize: number;
  totalTime: number;
  timestamp: string;
  success: boolean;
}

/**
 * Check if the page loaded within acceptable time limits
 * @param metrics Page load metrics
 * @param threshold Maximum acceptable load time in milliseconds
 * @returns Boolean indicating if performance is acceptable
 */
export function isPerformanceAcceptable(metrics: PageLoadMetrics, threshold: number = 3000): boolean {
  return metrics.totalLoadTime <= threshold;
}

/**
 * Format metrics for logging
 * @param metrics Page load or API metrics 
 * @returns Formatted string for console output
 */
export function formatMetricsForLogging(metrics: PageLoadMetrics | ApiResponseMetrics): string {
  return Object.entries(metrics)
    .map(([key, value]) => {
      if (typeof value === 'number' && key.toLowerCase().includes('time')) {
        return `${key}: ${value}ms`;
      }
      return `${key}: ${value}`;
    })
    .join('\n');
}

/**
 * Collect performance metrics for multiple page navigations
 * @param page Playwright page
 * @param urls List of URLs to navigate to
 * @returns Array of page load metrics for each URL
 */
export async function collectMetricsForUrls(
  page: Page, 
  urls: string[]
): Promise<{url: string, loadTime: number}[]> {
  const results: {url: string, loadTime: number}[] = [];
  
  for (const url of urls) {
    // Navigate to URL and measure performance
    // Assume main content has loaded when there's an h1 or .content element
    const loadTime = await measurePageLoadTime(page, url, 'h1, .content, main', 30000);
    
    // Add to results
    results.push({
      url,
      loadTime
    });
  }
  
  return results;
}