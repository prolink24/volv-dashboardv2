import { test, expect } from '@playwright/test';
import { customMatchers } from './utils/test-matchers';

test.describe('Dashboard Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the dashboard page for each test
    await page.goto('/');
    
    // Wait for the dashboard to fully load
    await page.waitForSelector('h1:has-text("Dashboard")');
  });

  test('should display all dashboard KPI cards', async ({ page }) => {
    // Check that all KPI metric cards are visible
    await customMatchers.toHaveCountAtLeast(page.locator('.metric-card'), 4);
    
    // Verify that each card has a title and value
    const metricCards = page.locator('.metric-card');
    const count = await metricCards.count();
    
    for (let i = 0; i < count; i++) {
      const card = metricCards.nth(i);
      await expect(card.locator('.metric-title')).toBeVisible();
      await expect(card.locator('.metric-value')).toBeVisible();
    }
  });

  test('should display attribution statistics', async ({ page }) => {
    // Check that the attribution statistics section is present
    await expect(page.locator('h2:has-text("Attribution Statistics")')).toBeVisible();
    
    // Verify that the attribution chart is displayed
    await expect(page.locator('.attribution-chart')).toBeVisible();
    
    // Check that the chart has data (look for SVG elements)
    await expect(page.locator('.attribution-chart svg')).toBeVisible();
  });

  test('should allow filtering metrics by date range', async ({ page }) => {
    // Click on the date range selector
    await page.click('button:has-text("Date Range")');
    
    // Select a different date range (e.g., "Last 7 Days")
    await page.click('div[role="option"]:has-text("Last 7 Days")');
    
    // Wait for the dashboard to refresh with new data
    await page.waitForTimeout(1000);
    
    // Verify that the dashboard metrics are still visible
    await customMatchers.toHaveCountAtLeast(page.locator('.metric-card'), 4);
  });

  test('should allow filtering metrics by team member', async ({ page }) => {
    // Click on the team member selector
    await page.click('button:has-text("Team Member")');
    
    // Select a specific team member
    const teammateSelector = page.locator('div[role="option"]').first();
    const teammateName = await customMatchers.getTextSafely(teammateSelector);
    await teammateSelector.click();
    
    // Wait for the dashboard to refresh with new data
    await page.waitForTimeout(1000);
    
    // Verify that the dashboard now displays the filtered data
    // Check for a label indicating which team member is selected
    await expect(page.locator(`text=${teammateName}`)).toBeVisible();
  });

  test('should display recent activity feed', async ({ page }) => {
    // Check that the recent activity section is visible
    await expect(page.locator('h2:has-text("Recent Activity")')).toBeVisible();
    
    // Verify that activity items are listed
    await customMatchers.toHaveCountAtLeast(page.locator('.activity-feed .activity-item'), 1);
    
    // Check for timestamps in the activity items
    await expect(page.locator('.activity-feed .activity-timestamp')).toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that the dashboard adjusts to mobile layout
    // Metrics should stack vertically
    const firstMetricCard = page.locator('.metric-card').first();
    const secondMetricCard = page.locator('.metric-card').nth(1);
    
    // Verify vertical stacking by checking y positions
    await customMatchers.checkVerticalStacking(firstMetricCard, secondMetricCard);
  });

  test('should navigate to detailed metrics on card click', async ({ page }) => {
    // Click on a metric card
    await page.click('.metric-card:has-text("Contacts")');
    
    // Should navigate to the detailed contacts page
    await expect(page).toHaveURL(/.*\/contacts/);
    await expect(page.locator('h1:has-text("Contacts")')).toBeVisible();
  });
});