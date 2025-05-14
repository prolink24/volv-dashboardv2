import { test, expect } from '@playwright/test';
import { customMatchers } from './utils/test-matchers';
import { skipTest, skipIf, asyncUtils } from './utils/test-helpers';

test.describe('KPI Configuration Hook Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to KPI configuration page
    await page.goto('/settings/kpi-configuration');
    
    // Wait for the page to fully load and data to be fetched
    await page.waitForSelector('h1:has-text("KPI Configuration")');
    await page.waitForTimeout(1000); // Wait for data fetch
  });

  test('should toggle KPI visibility correctly', async ({ page }) => {
    // Find an inactive KPI to test with
    const inactiveKpi = page.locator('.kpi-toggle:not([data-state="checked"])').first();
    
    // Skip test if no inactive KPIs found
    if (await inactiveKpi.count() === 0) {
      skipTest('No inactive KPIs found to test toggle functionality');
      return;
    }
    
    // Get the KPI name
    const kpiItem = inactiveKpi.locator('//ancestor::div[contains(@class, "kpi-item")]');
    const kpiName = await customMatchers.getTextSafely(kpiItem.locator('h3'));
    
    // Toggle the KPI ON
    await inactiveKpi.click();
    
    // Wait for the toggle action to complete (API call)
    await page.waitForTimeout(1000);
    
    // Verify the KPI is now in the Active KPIs section
    await expect(page.locator('.active-kpis-list').locator(`text=${kpiName}`)).toBeVisible();
    
    // Verify the state changes are reflected in the DOM
    await expect(inactiveKpi).toHaveAttribute('data-state', 'checked');
    
    // Toggle it OFF again
    await inactiveKpi.click();
    
    // Wait for the toggle action to complete
    await page.waitForTimeout(1000);
    
    // Verify it's removed from the active list
    await expect(page.locator('.active-kpis-list').locator(`text=${kpiName}`)).not.toBeVisible();
    
    // Verify the state is toggled back
    await expect(inactiveKpi).toHaveAttribute('data-state', 'unchecked');
  });

  test('should save KPI formula changes', async ({ page }) => {
    // Find an active KPI to edit
    const activeKpi = page.locator('.active-kpis-list .kpi-item').first();
    
    // Skip test if no active KPIs
    if (await activeKpi.count() === 0) {
      skipTest('No active KPIs found to test formula editing');
      return;
    }
    
    // Click the edit button
    await activeKpi.locator('button:has-text("Edit")').click();
    
    // Wait for formula editor
    await expect(page.locator('.formula-editor')).toBeVisible();
    
    // Get current formula
    const formulaInput = page.locator('.formula-editor textarea');
    const originalFormula = await formulaInput.inputValue();
    
    // Modify formula (add comment to make it unique but functionally identical)
    const testId = Math.floor(Math.random() * 1000);
    const newFormula = originalFormula.includes('//') 
      ? originalFormula.replace(/\/\/.*$/, `// Test ${testId}`)
      : `${originalFormula} // Test ${testId}`;
    
    await formulaInput.fill(newFormula);
    
    // Save the changes
    await page.locator('button:has-text("Save Formula")').click();
    
    // Wait for save to complete
    await page.waitForTimeout(1000);
    
    // Verify the formula was updated by reopening the editor
    await activeKpi.locator('button:has-text("Edit")').click();
    
    // Check the formula contains our change
    const updatedFormula = await page.locator('.formula-editor textarea').inputValue();
    expect(updatedFormula).toContain(`Test ${testId}`);
    
    // Restore original formula
    await page.locator('.formula-editor textarea').fill(originalFormula);
    await page.locator('button:has-text("Save Formula")').click();
    
    // Close editor (if needed)
    if (await page.locator('button:has-text("Cancel")').isVisible()) {
      await page.locator('button:has-text("Cancel")').click();
    }
  });

  test('should add and delete custom fields', async ({ page }) => {
    // Generate unique test field name
    const testFieldName = `Test Field ${Math.floor(Math.random() * 10000)}`;
    
    // Click Add Custom Field button
    await page.locator('button:has-text("Add Custom Field")').click();
    
    // Wait for dialog
    await expect(page.locator('h2:has-text("Add Custom Field")')).toBeVisible();
    
    // Fill form
    await page.locator('input[placeholder="Field Name"]').fill(testFieldName);
    await page.locator('select[name="fieldType"]').selectOption('text');
    
    // Submit form
    await page.locator('button:has-text("Create Field")').click();
    
    // Wait for field to be created
    await page.waitForTimeout(1000);
    
    // Verify field appears in list
    await expect(page.locator('.custom-fields-list').locator(`text=${testFieldName}`)).toBeVisible();
    
    // Now delete the field
    await page.locator(`.custom-fields-list tr:has-text("${testFieldName}") button:has-text("Delete")`).click();
    
    // Confirm deletion
    await page.locator('button:has-text("Confirm")').click();
    
    // Wait for deletion
    await page.waitForTimeout(1000);
    
    // Verify field is gone
    await expect(page.locator('.custom-fields-list').locator(`text=${testFieldName}`)).not.toBeVisible();
  });

  test('should validate formula syntax', async ({ page }) => {
    // Find an active KPI to edit
    const activeKpi = page.locator('.active-kpis-list .kpi-item').first();
    
    // Skip test if no active KPIs
    if (await activeKpi.count() === 0) {
      skipTest('No active KPIs found to test formula validation');
      return;
    }
    
    // Click the edit button
    await activeKpi.locator('button:has-text("Edit")').click();
    
    // Wait for the formula editor
    await expect(page.locator('.formula-editor')).toBeVisible();
    
    // Get original formula to restore later
    const originalFormula = await page.locator('.formula-editor textarea').inputValue();
    
    // Enter invalid formula
    await page.locator('.formula-editor textarea').fill('invalid_function()');
    
    // Try to save
    await page.locator('button:has-text("Save Formula")').click();
    
    // Verify error is shown
    await expect(page.locator('.error-message, .text-red-500')).toBeVisible();
    
    // Enter valid formula
    await page.locator('.formula-editor textarea').fill('SUM(contacts_count)');
    
    // Save the valid formula
    await page.locator('button:has-text("Save Formula")').click();
    
    // Wait for save
    await page.waitForTimeout(1000);
    
    // Verify no error is shown
    await expect(page.locator('.error-message, .text-red-500')).not.toBeVisible();
    
    // Restore original formula
    await activeKpi.locator('button:has-text("Edit")').click();
    await page.locator('.formula-editor textarea').fill(originalFormula);
    await page.locator('button:has-text("Save Formula")').click();
  });

  test('should preserve state between page navigations', async ({ page }) => {
    // Record current active KPIs count
    const initialActiveKpisCount = await page.locator('.active-kpis-list .kpi-item').count();
    
    // Navigate away from the page
    await page.click('a:has-text("Dashboard")');
    
    // Wait for dashboard to load
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    
    // Navigate back to KPI configuration
    await page.click('a:has-text("Settings")');
    await page.click('a:has-text("KPI Configuration")');
    
    // Wait for page to load
    await expect(page.locator('h1:has-text("KPI Configuration")')).toBeVisible();
    
    // Verify the same number of active KPIs are shown
    await expect(page.locator('.active-kpis-list .kpi-item')).toHaveCount(initialActiveKpisCount);
  });

  test('should show loading state and handle errors', async ({ page }) => {
    // Simulate slow API by intercepting requests
    await page.route('**/api/settings/kpi-configuration**', async (route) => {
      // Delay the response
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Continue with the request
      await route.continue();
    });
    
    // Reload page to trigger the intercepted API call
    await page.reload();
    
    // Check for loading state
    const loadingIndicator = page.locator('.loading-indicator, .spinner, [aria-label="Loading"]');
    const hasLoadingState = await loadingIndicator.isVisible();
    
    if (hasLoadingState) {
      // Verify loading indicator appears
      await expect(loadingIndicator).toBeVisible();
      
      // Verify it disappears after load
      await expect(loadingIndicator).not.toBeVisible({ timeout: 5000 });
    }
    
    // Now test error handling by making a request fail
    await page.route('**/api/settings/kpi-configuration/kpis', route => {
      return route.fulfill({
        status: 500,
        body: JSON.stringify({ success: false, error: 'Test error' })
      });
    });
    
    // Try to toggle a KPI (which should trigger the error handler)
    const kpiToggle = page.locator('.kpi-toggle').first();
    if (await kpiToggle.count() > 0) {
      await kpiToggle.click();
      
      // Wait for error notification
      await expect(page.locator('.error-notification, .toast-error, .text-red-500')).toBeVisible({ timeout: 5000 });
    }
  });
});