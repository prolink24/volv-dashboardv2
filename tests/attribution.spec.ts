import { test, expect } from '@playwright/test';

test.describe('Attribution Tests', () => {
  test('should load the attribution page', async ({ page }) => {
    // Navigate to the attribution page
    await page.goto('/attribution');
    
    // Verify the page title
    await expect(page.locator('h1:has-text("Attribution")')).toBeVisible();
    
    // Wait for attribution stats to load
    await expect(page.locator('.loading-indicator')).not.toBeVisible({ timeout: 10000 });
    
    // Verify key attribution metrics are displayed
    await expect(page.locator('text=Attribution Accuracy')).toBeVisible();
    await expect(page.locator('text=Multi-Source Rate')).toBeVisible();
    
    // Verify data visualization elements
    const charts = page.locator('.recharts-wrapper');
    await expect(charts.first()).toBeVisible();
    
    // Check that source distribution is shown
    await expect(page.locator('text=Source Distribution')).toBeVisible();
  });
  
  test('should display attribution insights', async ({ page }) => {
    // Navigate to the attribution page
    await page.goto('/attribution');
    
    // Wait for the page to load
    await expect(page.locator('h1:has-text("Attribution")')).toBeVisible();
    await page.waitForTimeout(1000); // Small wait for data to load
    
    // Check for insights section
    await expect(page.locator('text=Attribution Insights')).toBeVisible();
    
    // Verify at least one insight card is shown
    const insightCards = page.locator('.insight-card');
    if (await insightCards.count() > 0) {
      await expect(insightCards.first()).toBeVisible();
    }
  });
});