import { test, expect } from '@playwright/test';
import { customMatchers } from './utils/test-matchers';
import { skipTest, skipIf, asyncUtils, testConstants } from './utils/test-helpers';

test.describe('KPI Configuration Hook Tests', () => {
  // These tests verify that the KPI configuration hook works correctly
  // The hook should load, update, and persist KPI configuration data
  
  test.beforeEach(async ({ page }) => {
    // Navigate to KPI configuration page where the hook is used
    await page.goto('/settings/kpi-configuration');
    
    // Wait for the page to load
    await page.waitForSelector('h1:has-text("KPI Configuration"), h1:has-text("Configuration")', { timeout: 10000 });
  });

  test('should load KPI configuration data correctly', async ({ page }) => {
    // Two ways to check this:
    // 1. Through the API directly (more reliable)
    // 2. Through the UI which uses the hook (more end-to-end)
    
    // Method 1: Check API directly
    const apiResponse = await page.request.get('/api/settings/kpi-configuration');
    expect(apiResponse.status()).toBe(200);
    
    const data = await apiResponse.json();
    expect(data.success).toBe(true);
    expect(data.kpiConfig).toBeDefined();
    
    // Method 2: Check UI elements that depend on hook data
    const kpiList = page.locator('.kpi-list, .config-list, [data-testid="kpi-list"]');
    await expect(kpiList).toBeVisible();
    
    const kpiItems = kpiList.locator('.kpi-item, .config-item, [data-testid="kpi-item"]');
    await customMatchers.toHaveCountAtLeast(kpiItems, 1);
    
    // Verify the UI is using real data by checking that at least one KPI has a name
    const firstItemName = kpiItems.first().locator('.kpi-name, .config-name, h3');
    const nameText = await customMatchers.getTextSafely(firstItemName);
    expect(nameText.length).toBeGreaterThan(0);
  });

  test('should update KPI configuration through the hook', async ({ page }) => {
    // Find a toggle to interact with (it should use the hook's update function)
    const toggleButton = page.locator('button.toggle, input[type="checkbox"], [role="switch"]').first();
    
    if (await toggleButton.count() === 0) {
      skipTest('No toggle buttons found to test hook update functionality');
      return;
    }
    
    // Get the initial state from the API
    const initialResponse = await page.request.get('/api/settings/kpi-configuration');
    const initialData = await initialResponse.json();
    const initialActiveKpis = initialData.kpiConfig.activeKpis || [];
    
    // Record the initial count of active KPIs
    const initialActiveCount = initialActiveKpis.length;
    
    // Click the toggle to change the state
    await toggleButton.click();
    
    // Wait for the change to be processed
    await page.waitForTimeout(1000);
    
    // Get the updated state from the API
    const updatedResponse = await page.request.get('/api/settings/kpi-configuration');
    const updatedData = await updatedResponse.json();
    const updatedActiveKpis = updatedData.kpiConfig.activeKpis || [];
    
    // The count should have changed (either increased or decreased by 1)
    const updatedActiveCount = updatedActiveKpis.length;
    const countDifference = Math.abs(updatedActiveCount - initialActiveCount);
    
    expect(countDifference).toBe(1);
    
    // Toggle back to original state
    await toggleButton.click();
    
    // Wait for the change to be processed
    await page.waitForTimeout(1000);
    
    // Verify the count is back to the initial value
    const finalResponse = await page.request.get('/api/settings/kpi-configuration');
    const finalData = await finalResponse.json();
    const finalActiveKpis = finalData.kpiConfig.activeKpis || [];
    
    expect(finalActiveKpis.length).toBe(initialActiveCount);
  });

  test('should handle concurrent updates correctly', async ({ page }) => {
    // Find multiple toggle buttons
    const toggleButtons = page.locator('button.toggle, input[type="checkbox"], [role="switch"]');
    
    if (await toggleButtons.count() < 2) {
      skipTest('Not enough toggle buttons found to test concurrent updates');
      return;
    }
    
    // Click two toggles in quick succession
    await toggleButtons.nth(0).click();
    await toggleButtons.nth(1).click();
    
    // Wait for both updates to process
    await page.waitForTimeout(1500);
    
    // Verify the page doesn't crash and the API is still accessible
    const response = await page.request.get('/api/settings/kpi-configuration');
    expect(response.status()).toBe(200);
    
    // Verify both toggles reflect their new states in the UI
    // This would check if there were any race conditions in the hook
    const button1State = await toggleButtons.nth(0).getAttribute('data-state') || 
                         await toggleButtons.nth(0).getAttribute('aria-checked');
    const button2State = await toggleButtons.nth(1).getAttribute('data-state') || 
                         await toggleButtons.nth(1).getAttribute('aria-checked');
    
    expect(button1State).not.toBeNull();
    expect(button2State).not.toBeNull();
    
    // Reset the toggles
    await toggleButtons.nth(0).click();
    await toggleButtons.nth(1).click();
    await page.waitForTimeout(1000);
  });

  test('should maintain state across page navigations', async ({ page }) => {
    // Find a toggle button
    const toggleButton = page.locator('button.toggle, input[type="checkbox"], [role="switch"]').first();
    
    if (await toggleButton.count() === 0) {
      skipTest('No toggle buttons found to test state persistence');
      return;
    }
    
    // Get initial state
    const initialState = await toggleButton.getAttribute('data-state') || 
                         await toggleButton.getAttribute('aria-checked');
    
    // Toggle the state
    await toggleButton.click();
    await page.waitForTimeout(1000);
    
    // Get the new state
    const newState = await toggleButton.getAttribute('data-state') || 
                     await toggleButton.getAttribute('aria-checked');
    
    // Navigate away
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Navigate back
    await page.goto('/settings/kpi-configuration');
    await page.waitForTimeout(1000);
    
    // Find the same toggle button again
    const toggleButtonAfterNav = page.locator('button.toggle, input[type="checkbox"], [role="switch"]').first();
    
    // Check that it maintained the new state
    const stateAfterNav = await toggleButtonAfterNav.getAttribute('data-state') || 
                           await toggleButtonAfterNav.getAttribute('aria-checked');
    
    expect(stateAfterNav).toBe(newState);
    expect(stateAfterNav).not.toBe(initialState);
    
    // Toggle back to initial state
    await toggleButtonAfterNav.click();
    await page.waitForTimeout(1000);
  });

  test('should handle error states in the hook', async ({ page }) => {
    // Intercept API calls to simulate errors
    await page.route('/api/settings/kpi-configuration', async (route) => {
      // Return a 500 error
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Simulated server error' })
      });
    });
    
    // Refresh the page to trigger the hook with the intercepted response
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Check for error state indicators
    const errorMessage = page.locator('.error-message, .alert-error, .text-red-500:visible');
    const hasError = await errorMessage.count() > 0;
    
    // There should either be an error message or a retry mechanism
    const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try again")');
    const hasRetry = await retryButton.count() > 0;
    
    expect(hasError || hasRetry).toBe(true);
    
    // Clear the route interception
    await page.unroute('/api/settings/kpi-configuration');
    
    // Reload to restore normal functionality
    await page.reload();
    await page.waitForTimeout(2000);
  });

  test('should optimize API calls with caching', async ({ page }) => {
    // Define a way to count API calls
    let apiCallCount = 0;
    
    // Intercept API calls to count them
    await page.route('/api/settings/kpi-configuration', async (route) => {
      apiCallCount++;
      // Pass through the request
      await route.continue();
    });
    
    // Load the page (should trigger one API call)
    await page.reload();
    await page.waitForTimeout(1000);
    
    // Multiple UI interactions in quick succession should use the cached data
    const toggles = page.locator('button.toggle, input[type="checkbox"], [role="switch"]');
    
    if (await toggles.count() >= 2) {
      // Click different toggles
      await toggles.nth(0).click();
      await page.waitForTimeout(500);
      await toggles.nth(0).click(); // Toggle back
      
      await toggles.nth(1).click();
      await page.waitForTimeout(500);
      await toggles.nth(1).click(); // Toggle back
    }
    
    // The hook should batch updates or use optimistic updates with a single API call
    // We expect a maximum of 3 API calls (initial load + 1-2 updates)
    expect(apiCallCount).toBeLessThanOrEqual(3);
    
    // Clear the route interception
    await page.unroute('/api/settings/kpi-configuration');
  });

  test('should provide loading states during API calls', async ({ page }) => {
    // Make API response slower to ensure we can observe loading states
    await page.route('/api/settings/kpi-configuration', async (route) => {
      // Delay the response by 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });
    
    // Refresh to trigger a new API call
    await page.reload();
    
    // Check for loading indicators immediately after reload
    const loadingIndicator = page.locator('.loading, .spinner, .skeleton');
    const hasLoading = await loadingIndicator.count() > 0;
    
    // Either there should be a loading indicator, or the content should be disabled/inactive
    const disabledContent = page.locator('[aria-disabled="true"], .disabled, .inactive');
    const hasDisabled = await disabledContent.count() > 0;
    
    expect(hasLoading || hasDisabled).toBe(true);
    
    // Wait for the API call to complete
    await page.waitForTimeout(1500);
    
    // Now the content should be loaded and interactive
    const kpiItems = page.locator('.kpi-item, .config-item, [data-testid="kpi-item"]');
    await customMatchers.toHaveCountAtLeast(kpiItems, 1);
    
    // Clear the route interception
    await page.unroute('/api/settings/kpi-configuration');
  });
});