import { test, expect } from '@playwright/test';

test.describe('KPI Configuration Tests', () => {
  test('should load the KPI configuration page', async ({ page }) => {
    // Navigate to the KPI configuration page
    await page.goto('/settings/kpi-configuration');
    
    // Verify the page title
    await expect(page.locator('h1:has-text("KPI Configuration")')).toBeVisible();
    
    // Verify tabs are present
    await expect(page.locator('button:has-text("Formulas")')).toBeVisible();
    await expect(page.locator('button:has-text("Fields")')).toBeVisible();
    await expect(page.locator('button:has-text("Import/Export")')).toBeVisible();
    
    // Check that data has loaded (not in loading state)
    await expect(page.locator('.loading-indicator')).not.toBeVisible({ timeout: 10000 });
    
    // Verify KPI categories are loaded
    const categoriesSection = page.locator('button:has-text("All Categories")');
    await expect(categoriesSection).toBeVisible();
  });
  
  test('should toggle a KPI formula', async ({ page }) => {
    // Navigate to the KPI configuration page
    await page.goto('/settings/kpi-configuration');
    
    // Wait for data to load
    await expect(page.locator('h1:has-text("KPI Configuration")')).toBeVisible();
    await page.waitForTimeout(1000); // Small wait for data to load
    
    // Click on the first KPI formula (if any)
    const kpiFormulas = page.locator('div.space-y-1 button').filter({ hasText: /^(?!All Categories)/ });
    if (await kpiFormulas.count() > 0) {
      await kpiFormulas.first().click();
      
      // Verify formula details are displayed
      await expect(page.locator('h3:has-text("Formula")')).toBeVisible();
      
      // Toggle the KPI enabled state
      const toggleSwitch = page.locator('button[role="switch"]');
      const initialState = await toggleSwitch.isChecked();
      
      // Click the toggle
      await toggleSwitch.click();
      
      // Verify the state changed
      await expect(toggleSwitch).toHaveAttribute('aria-checked', String(!initialState));
      
      // Toggle back to avoid test side effects
      await toggleSwitch.click();
      await expect(toggleSwitch).toHaveAttribute('aria-checked', String(initialState));
    }
  });
});