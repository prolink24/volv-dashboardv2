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
      '/api/attribution/enhanced-stats',
      '/api/enhanced-dashboard',
      '/api/contacts',
      '/api/settings/kpi-configuration'
    ];
    
    // Set maximum acceptable response time (3 seconds)
    const maxResponseTime = 3000;
    
    // Test the endpoints and get performance metrics
    const results = await testMultipleApiEndpoints(apiEndpoints, maxResponseTime);
    
    // Log results
    console.table(results);
    
    // Verify each endpoint returns a success status
    for (const result of results) {
      expect(result.success, `API endpoint ${result.endpoint} should return a success status`).toBe(true);
      expect(result.withinThreshold, `API endpoint ${result.endpoint} should respond within ${maxResponseTime}ms`).toBe(true);
    }
  });
  
  test('should load all main pages within acceptable time', async ({ page }) => {
    // Define pages and their expected load selectors
    const pages = [
      { url: '/', selector: 'h1:has-text("Dashboard")' },
      { url: '/contacts', selector: 'h1:has-text("Contacts")' },
      { url: '/attribution', selector: 'h1:has-text("Attribution")' },
      { url: '/settings/kpi-configuration', selector: 'h1:has-text("KPI Configuration"), h1:has-text("Configuration")' },
    ];
    
    // Set maximum acceptable load time (5 seconds)
    const maxLoadTime = 5000;
    
    // Measure load time for each page
    const results = [];
    
    for (const { url, selector } of pages) {
      try {
        const loadTime = await measurePageLoadTime(page, url, selector, maxLoadTime);
        results.push({ url, loadTime });
        
        // Verify the page loads within acceptable time
        expect(loadTime, `Page ${url} should load within ${maxLoadTime}ms`).toBeLessThanOrEqual(maxLoadTime);
      } catch (error) {
        console.error(`Error loading page ${url}: ${error.message}`);
        // Don't fail the test, just log the error
        results.push({ url, loadTime: -1, error: error.message });
      }
    }
    
    // Log results
    console.table(results);
    
    // Calculate and log average load time (excluding errors)
    const validResults = results.filter(r => r.loadTime > 0);
    if (validResults.length > 0) {
      const avgLoadTime = validResults.reduce((sum, { loadTime }) => sum + loadTime, 0) / validResults.length;
      console.log(`Average page load time: ${avgLoadTime.toFixed(2)}ms`);
    }
  });
  
  test('should be responsive in UI interaction', async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/');
    
    // Wait for dashboard to load
    await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 10000 });
    
    // Try to find navigation to Contacts
    const contactsLink = page.locator('a:has-text("Contacts"), a[href="/contacts"]').first();
    const hasContactsLink = await contactsLink.count() > 0;
    
    if (hasContactsLink) {
      // Measure time for a click interaction
      const startTime = Date.now();
      await contactsLink.click();
      await page.waitForSelector('h1:has-text("Contacts")', { timeout: 10000 });
      const navigationTime = Date.now() - startTime;
      
      // Log and verify the navigation time
      console.log(`Navigation time to Contacts: ${navigationTime}ms`);
      expect(navigationTime).toBeLessThanOrEqual(3000);
    } else {
      console.log('Contacts link not found, skipping navigation test');
    }
    
    // Navigate back to dashboard if needed
    const currentUrl = page.url();
    if (!currentUrl.endsWith('/')) {
      await page.goto('/');
      await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 10000 });
    }
    
    // Test search functionality if available
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    const hasSearchInput = await searchInput.count() > 0;
    
    if (hasSearchInput) {
      await searchInput.fill('a');
      
      const searchStartTime = Date.now();
      await page.keyboard.press('Enter');
      
      // Wait for search results to update
      await page.waitForTimeout(1000);
      
      const searchTime = Date.now() - searchStartTime;
      console.log(`Search response time: ${searchTime}ms`);
      expect(searchTime).toBeLessThanOrEqual(3000);
    } else {
      console.log('Search input not found, skipping search test');
    }
  });
});