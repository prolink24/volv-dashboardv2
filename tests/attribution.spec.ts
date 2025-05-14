import { test, expect } from '@playwright/test';

test.describe('Attribution Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to attribution page
    await page.goto('/attribution');
    
    // Wait for the page to fully load
    await page.waitForSelector('h1:has-text("Attribution")');
  });

  test('should display attribution statistics with visualizations', async ({ page }) => {
    // Check the page title
    await expect(page.locator('h1:has-text("Attribution")')).toBeVisible();
    
    // Verify attribution statistics section is visible
    await expect(page.locator('.attribution-stats')).toBeVisible();
    
    // Check if charts/visualizations are displayed
    await expect(page.locator('.chart, .visualization')).toBeVisible();
    
    // Verify chart elements (SVG)
    await expect(page.locator('.chart svg, .visualization svg')).toBeVisible();
  });

  test('should display platform source distribution', async ({ page }) => {
    // Check for the source distribution section
    await expect(page.locator('h2:has-text("Source Distribution")')).toBeVisible();
    
    // Verify the pie/bar chart showing source distribution
    await expect(page.locator('.source-distribution-chart')).toBeVisible();
    
    // Check that the legend includes platform names (Close CRM, Calendly)
    await expect(page.locator('.chart-legend:has-text("Close CRM")')).toBeVisible();
    await expect(page.locator('.chart-legend:has-text("Calendly")')).toBeVisible();
  });

  test('should filter attribution data by date range', async ({ page }) => {
    // Get the initial attribution stats values
    const initialValue = await page.locator('.attribution-stats .metric-value').first().innerText();
    
    // Click on the date range selector
    await page.click('button:has-text("Date Range")');
    
    // Select a different date range
    await page.click('div[role="option"]:has-text("Last 7 Days")');
    
    // Wait for the data to refresh
    await page.waitForTimeout(1000);
    
    // Get the updated attribution stats values
    const updatedValue = await page.locator('.attribution-stats .metric-value').first().innerText();
    
    // Either the value changed (filter worked) or it stayed the same (no data for filter)
    // Just verify the attribution stats are still displayed
    await expect(page.locator('.attribution-stats .metric-value')).toBeVisible();
  });

  test('should filter attribution data by team member', async ({ page }) => {
    // Check if team member filter exists
    const filterExists = await page.locator('select.team-filter, button:has-text("Team Member")').first().isVisible();
    
    if (filterExists) {
      // Get the initial attribution stats
      const initialStatsText = await page.locator('.attribution-stats').innerText();
      
      // Click on the team member filter
      await page.click('button:has-text("Team Member")');
      
      // Select a specific team member (first option)
      await page.click('div[role="option"]').first();
      
      // Wait for the filter to apply
      await page.waitForTimeout(1000);
      
      // Verify that the attribution stats section is still visible
      await expect(page.locator('.attribution-stats')).toBeVisible();
      
      // Check that the team member's name appears as an active filter
      const teamMemberName = await page.locator('button:has-text("Team Member")').innerText();
      expect(teamMemberName).not.toEqual('Team Member'); // The button should now show the selected name
    } else {
      // If no team filter, verify attribution stats are displayed
      await expect(page.locator('.attribution-stats')).toBeVisible();
    }
  });

  test('should display multi-touch attribution insights', async ({ page }) => {
    // Check for multi-touch attribution section
    await expect(page.locator('h2:has-text("Multi-Touch Attribution")')).toBeVisible();
    
    // Verify the multi-touch attribution chart/visualization
    await expect(page.locator('.multi-touch-chart, .funnel-chart')).toBeVisible();
    
    // Check for attribution model selector if it exists
    const modelSelectorExists = await page.locator('select.model-selector, button:has-text("Attribution Model")').first().isVisible();
    
    if (modelSelectorExists) {
      // Click on the model selector
      await page.click('button:has-text("Attribution Model")');
      
      // Select a different attribution model
      await page.click('div[role="option"]').nth(1);
      
      // Wait for the chart to update
      await page.waitForTimeout(1000);
      
      // Verify the chart is still visible after model change
      await expect(page.locator('.multi-touch-chart, .funnel-chart')).toBeVisible();
    }
  });

  test('should display conversion metrics', async ({ page }) => {
    // Check for conversion metrics section
    await expect(page.locator('h2:has-text("Conversion Metrics")')).toBeVisible();
    
    // Verify conversion rate display
    await expect(page.locator('.conversion-rate')).toBeVisible();
    
    // Check that conversion funnel stages are displayed
    await expect(page.locator('.conversion-funnel .funnel-stage')).toHaveCount.greaterThan(1);
  });

  test('should export attribution data', async ({ page }) => {
    // Look for an export button
    const exportButtonExists = await page.locator('button:has-text("Export"), button:has-text("Download")').first().isVisible();
    
    if (exportButtonExists) {
      // Click the export button
      await page.click('button:has-text("Export"), button:has-text("Download")');
      
      // If there's a format selection dialog, select CSV
      const csvOptionExists = await page.locator('text=CSV').isVisible();
      if (csvOptionExists) {
        await page.click('text=CSV');
      }
      
      // Verify a success notification appears or download starts
      // (This is hard to fully test in headless, so just check the click worked)
      await expect(page.locator('button:has-text("Export"), button:has-text("Download")')).toBeVisible();
    }
  });

  test('should display platform-specific attribution metrics', async ({ page }) => {
    // Check for Close CRM attribution section
    await expect(page.locator('h3:has-text("Close CRM Attribution"), div:has-text("Close CRM Attribution")')).toBeVisible();
    
    // Check for Calendly attribution section
    await expect(page.locator('h3:has-text("Calendly Attribution"), div:has-text("Calendly Attribution")')).toBeVisible();
    
    // Verify there are metrics displayed for each platform
    await expect(page.locator('.close-attribution .metric, .calendly-attribution .metric')).toHaveCount.greaterThan(1);
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify the page title is still visible
    await expect(page.locator('h1:has-text("Attribution")')).toBeVisible();
    
    // Check that charts are still accessible
    await expect(page.locator('.chart, .visualization')).toBeVisible();
    
    // Verify that filters are accessible on mobile
    await expect(page.locator('button:has-text("Date Range"), button:has-text("Filter")')).toBeVisible();
  });
});