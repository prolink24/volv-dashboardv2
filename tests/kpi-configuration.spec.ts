import { test, expect } from '@playwright/test';

test.describe('KPI Configuration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to KPI configuration page
    await page.goto('/settings/kpi-configuration');
    
    // Wait for the page to fully load
    await page.waitForSelector('h1:has-text("KPI Configuration")');
  });

  test('should display all KPI configuration sections', async ({ page }) => {
    // Check if all required sections are present
    await expect(page.locator('h2:has-text("Available KPIs")')).toBeVisible();
    await expect(page.locator('h2:has-text("Active KPIs")')).toBeVisible();
    await expect(page.locator('h2:has-text("Custom Fields")')).toBeVisible();
    
    // Verify the KPI toggle switches are present
    await expect(page.locator('.kpi-toggle')).toHaveCount.atLeast(3);
  });

  test('should toggle KPI visibility on/off', async ({ page }) => {
    // Find a KPI toggle that is currently OFF
    const inactiveKpi = page.locator('.kpi-toggle:not([data-state="checked"])').first();
    const kpiName = await inactiveKpi.locator('//ancestor::div[contains(@class, "kpi-item")]//h3').textContent();
    
    // Toggle the KPI ON
    await inactiveKpi.click();
    
    // Wait for the toggle to update
    await page.waitForTimeout(500);
    
    // Verify the KPI is now in the Active KPIs section
    await expect(page.locator('.active-kpis-list').locator(`text=${kpiName}`)).toBeVisible();
    
    // Toggle it OFF again
    await inactiveKpi.click();
    
    // Wait for the toggle to update
    await page.waitForTimeout(500);
    
    // Verify it's not in the active list anymore
    await expect(page.locator('.active-kpis-list').locator(`text=${kpiName}`)).not.toBeVisible();
  });

  test('should allow editing KPI formula', async ({ page }) => {
    // Find an active KPI to edit
    const activeKpi = page.locator('.active-kpis-list .kpi-item').first();
    
    // Click the edit button
    await activeKpi.locator('button:has-text("Edit")').click();
    
    // Wait for the formula editor to appear
    await expect(page.locator('.formula-editor')).toBeVisible();
    
    // Get the current formula
    const initialFormula = await page.locator('.formula-editor textarea').inputValue();
    
    // Modify the formula
    await page.locator('.formula-editor textarea').fill(initialFormula + ' * 1.0');
    
    // Save the changes
    await page.locator('button:has-text("Save Formula")').click();
    
    // Wait for the save to complete
    await page.waitForTimeout(500);
    
    // Verify the formula was updated (by reopening the editor)
    await activeKpi.locator('button:has-text("Edit")').click();
    await expect(page.locator('.formula-editor textarea')).toHaveValue(initialFormula + ' * 1.0');
    
    // Close the editor
    await page.locator('button:has-text("Cancel")').click();
  });

  test('should add and remove custom fields', async ({ page }) => {
    // Click the Add Custom Field button
    await page.click('button:has-text("Add Custom Field")');
    
    // Wait for the dialog to appear
    await expect(page.locator('h2:has-text("Add Custom Field")')).toBeVisible();
    
    // Fill in the form
    const fieldName = 'Test Field ' + Math.floor(Math.random() * 1000);
    await page.locator('input[placeholder="Field Name"]').fill(fieldName);
    await page.locator('select[name="fieldType"]').selectOption('text');
    
    // Submit the form
    await page.click('button:has-text("Create Field")');
    
    // Wait for the field to be created
    await page.waitForTimeout(500);
    
    // Verify the field appears in the custom fields list
    await expect(page.locator('.custom-fields-list').locator(`text=${fieldName}`)).toBeVisible();
    
    // Delete the field
    await page.locator(`.custom-fields-list tr:has-text("${fieldName}") button:has-text("Delete")`).click();
    
    // Confirm the deletion
    await page.locator('button:has-text("Confirm")').click();
    
    // Wait for the deletion to complete
    await page.waitForTimeout(500);
    
    // Verify the field is no longer in the list
    await expect(page.locator('.custom-fields-list').locator(`text=${fieldName}`)).not.toBeVisible();
  });

  test('should validate formula syntax', async ({ page }) => {
    // Find an active KPI to edit
    const activeKpi = page.locator('.active-kpis-list .kpi-item').first();
    
    // Click the edit button
    await activeKpi.locator('button:has-text("Edit")').click();
    
    // Wait for the formula editor to appear
    await expect(page.locator('.formula-editor')).toBeVisible();
    
    // Enter an invalid formula
    await page.locator('.formula-editor textarea').fill('invalid_function()');
    
    // Try to save the changes
    await page.locator('button:has-text("Save Formula")').click();
    
    // Verify that an error message is displayed
    await expect(page.locator('.error-message')).toBeVisible();
    
    // Fix the formula
    await page.locator('.formula-editor textarea').fill('SUM(contacts_count)');
    
    // Save the valid formula
    await page.locator('button:has-text("Save Formula")').click();
    
    // Verify no error is displayed
    await expect(page.locator('.error-message')).not.toBeVisible();
  });

  test('should have responsive layout on mobile', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify the page elements are still accessible
    await expect(page.locator('h1:has-text("KPI Configuration")')).toBeVisible();
    await expect(page.locator('h2:has-text("Available KPIs")')).toBeVisible();
    
    // Check if the KPI items stack vertically on mobile
    const firstKpi = page.locator('.kpi-item').first();
    const secondKpi = page.locator('.kpi-item').nth(1);
    
    // Get their positions
    const firstBox = await firstKpi.boundingBox();
    const secondBox = await secondKpi.boundingBox();
    
    // Verify they stack vertically in mobile view
    expect(secondBox.y).toBeGreaterThan(firstBox.y + firstBox.height - 5);
  });
});