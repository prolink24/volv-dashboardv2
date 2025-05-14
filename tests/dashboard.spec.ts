import { test, expect } from '@playwright/test';

test.describe('Dashboard Tests', () => {
  test('should load the dashboard page', async ({ page }) => {
    // Navigate to the dashboard page
    await page.goto('/');
    
    // Wait for the page to load
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    
    // Verify key KPI sections are visible
    await expect(page.locator('text=Cash Collected')).toBeVisible();
    await expect(page.locator('text=Revenue Generated')).toBeVisible();
    await expect(page.locator('text=Total Calls')).toBeVisible();
    
    // Verify sales team section is present
    await expect(page.locator('h2:has-text("Sales Team Performance")')).toBeVisible();
    
    // Check if data is loaded (not in loading state)
    await expect(page.locator('.loading-indicator')).not.toBeVisible({ timeout: 10000 });
  });
});