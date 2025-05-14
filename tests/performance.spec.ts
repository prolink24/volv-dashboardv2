import { test, expect } from '@playwright/test';
import { 
  testApiPerformance, 
  testMultipleApiEndpoints, 
  measurePageLoadTime 
} from './utils/api-performance';

test.describe('Performance Tests', () => {
  test('should load critical API endpoints within acceptable time', async ({ }) => {
    // Test key API endpoints
    const apiEndpoints = [
      '/api/dashboard',
      '/api/attribution/stats',
      '/api/contacts',
      '/api/settings/kpi-configuration'
    ];
    
    // Set maximum acceptable response time (3 seconds)
    const maxResponseTime = 3000;
    
    // Test the endpoints and get performance metrics
    const results = await testMultipleApiEndpoints(apiEndpoints, maxResponseTime);
    
    // Log results
    console.table(results);
    
    // Further analytics could be added here, like median response time
  });
  
  test('should load all main pages within acceptable time', async ({ page }) => {
    // Define pages and their expected load selectors
    const pages = [
      { url: '/', selector: 'h1:has-text("Dashboard")' },
      { url: '/contacts', selector: 'h1:has-text("Contacts")' },
      { url: '/attribution', selector: 'h1:has-text("Attribution")' },
      { url: '/settings/kpi-configuration', selector: 'h1:has-text("KPI Configuration")' },
    ];
    
    // Set maximum acceptable load time (5 seconds)
    const maxLoadTime = 5000;
    
    // Measure load time for each page
    const results = [];
    
    for (const { url, selector } of pages) {
      const loadTime = await measurePageLoadTime(page, url, selector, maxLoadTime);
      results.push({ url, loadTime });
    }
    
    // Log results
    console.table(results);
    
    // Calculate and log average load time
    const avgLoadTime = results.reduce((sum, { loadTime }) => sum + loadTime, 0) / results.length;
    console.log(`Average page load time: ${avgLoadTime.toFixed(2)}ms`);
  });
  
  test('should be responsive in UI interaction', async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/');
    
    // Measure time for a click interaction
    const startTime = Date.now();
    await page.click('a:has-text("Contacts")');
    await page.waitForSelector('h1:has-text("Contacts")');
    const navigationTime = Date.now() - startTime;
    
    // Log and verify the navigation time
    console.log(`Navigation time to Contacts: ${navigationTime}ms`);
    expect(navigationTime).toBeLessThanOrEqual(2000);
    
    // Test search functionality response time
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('a');
    
    const searchStartTime = Date.now();
    await page.keyboard.press('Enter');
    
    // Wait for search results to update (could be a specific element that indicates search completion)
    await page.waitForTimeout(1000);
    
    const searchTime = Date.now() - searchStartTime;
    console.log(`Search response time: ${searchTime}ms`);
    expect(searchTime).toBeLessThanOrEqual(2000);
  });
});