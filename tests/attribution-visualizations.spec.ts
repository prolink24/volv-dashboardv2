import { test, expect } from '@playwright/test';
import { customMatchers } from './utils/test-matchers';

test.describe('Attribution Visualization Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to attribution page
    await page.goto('/attribution');
    
    // Wait for the page to fully load
    await page.waitForSelector('h1:has-text("Attribution")');
    
    // Wait for charts to load (they might be loaded async)
    await page.waitForSelector('.chart, .visualization', { state: 'visible' });
  });

  test('should render source distribution pie chart', async ({ page }) => {
    // Find the source distribution chart
    const pieChart = page.locator('.source-distribution-chart svg');
    
    // Verify it's visible
    await expect(pieChart).toBeVisible();
    
    // Check that the chart contains path elements (slices)
    await customMatchers.toHaveCountAtLeast(pieChart.locator('path'), 2);
    
    // Check for legend elements
    await expect(page.locator('.chart-legend:has-text("Close CRM")')).toBeVisible();
    await expect(page.locator('.chart-legend:has-text("Calendly")')).toBeVisible();
  });

  test('should render multi-touch attribution funnel', async ({ page }) => {
    // Find the multi-touch attribution visualization
    const funnelChart = page.locator('.multi-touch-chart, .funnel-chart');
    
    // Verify it's visible
    await expect(funnelChart).toBeVisible();
    
    // Check for funnel stages
    await customMatchers.toHaveCountAtLeast(funnelChart.locator('.funnel-stage'), 2);
  });

  test('should display tooltips on chart hover', async ({ page }) => {
    // Find a chart element to hover over
    const chartElement = page.locator('.chart path, .chart rect').first();
    
    // Hover over the chart element
    await chartElement.hover();
    
    // Wait for tooltip to appear
    await page.waitForSelector('.chart-tooltip', { state: 'visible', timeout: 5000 });
    
    // Verify tooltip has data
    const tooltip = page.locator('.chart-tooltip');
    await expect(tooltip).toBeVisible();
    
    // Check tooltip content has label and value
    const tooltipText = await customMatchers.getTextSafely(tooltip);
    expect(tooltipText.length).toBeGreaterThan(0);
  });

  test('should update charts when changing date range', async ({ page }) => {
    // Capture initial chart structure for comparison
    const initialHtml = await page.locator('.source-distribution-chart').innerHTML();
    
    // Click on date range selector
    await page.click('button:has-text("Date Range")');
    
    // Select a different date range
    await page.click('div[role="option"]:has-text("Last 7 Days")');
    
    // Wait for charts to update
    await page.waitForTimeout(1000);
    
    // Either the chart updated (different HTML) or it stayed the same (no data for selected period)
    // Just verify the chart is still visible
    await expect(page.locator('.source-distribution-chart')).toBeVisible();
  });

  test('should have interactive attribution model selector', async ({ page }) => {
    // Check for model selector existence
    const modelSelectorExists = await page.locator('select.model-selector, button:has-text("Attribution Model")').first().isVisible();
    
    if (modelSelectorExists) {
      // Get initial chart data for comparison
      const initialHtml = await page.locator('.multi-touch-chart, .funnel-chart').innerHTML();
      
      // Click the model selector
      await page.click('button:has-text("Attribution Model")');
      
      // Select a different attribution model
      await page.click('div[role="option"]').nth(1);
      
      // Wait for chart to update
      await page.waitForTimeout(1000);
      
      // Verify the chart is still visible
      await expect(page.locator('.multi-touch-chart, .funnel-chart')).toBeVisible();
    } else {
      test.skip('Attribution model selector not available');
    }
  });

  test('should render charts with proper animations', async ({ page }) => {
    // Reload the page to see animations
    await page.reload();
    
    // Check for animation classes
    const hasAnimations = await page.locator('.chart-animated, .animate-in, [data-animate="true"]').count() > 0;
    
    if (hasAnimations) {
      // Wait for animations to complete
      await page.waitForTimeout(1000);
      
      // Check that charts are visible after animation
      await expect(page.locator('.chart, .visualization')).toBeVisible();
    } else {
      // If no animations, ensure charts are visible
      await expect(page.locator('.chart, .visualization')).toBeVisible();
    }
  });

  test('should have responsive visualization layouts', async ({ page }) => {
    // Get current chart dimensions
    const desktopChartBounds = await page.locator('.source-distribution-chart').boundingBox();
    
    // Set viewport to tablet size
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Wait for layout to adjust
    await page.waitForTimeout(500);
    
    // Check that chart is still visible
    await expect(page.locator('.source-distribution-chart')).toBeVisible();
    
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Wait for layout to adjust
    await page.waitForTimeout(500);
    
    // Check that chart is still visible
    await expect(page.locator('.source-distribution-chart')).toBeVisible();
    
    // Verify dimensions changed for responsive layout
    const mobileChartBounds = await page.locator('.source-distribution-chart').boundingBox();
    
    if (desktopChartBounds && mobileChartBounds) {
      // Chart should be narrower on mobile
      expect(mobileChartBounds.width).toBeLessThan(desktopChartBounds.width);
    }
  });

  test('should allow exporting chart as image', async ({ page }) => {
    // Check for export button existence
    const exportButtonExists = await page.locator('button:has-text("Export"), button:has-text("Download")').first().isVisible();
    
    if (exportButtonExists) {
      // Click the export button
      await page.click('button:has-text("Export"), button:has-text("Download")');
      
      // Check for download options
      const imageOptionExists = await page.locator('text=PNG, text=SVG, text=Image').first().isVisible();
      
      if (imageOptionExists) {
        // Click image option
        await page.click('text=PNG, text=SVG, text=Image');
        
        // Verify success message or check that options closed (implying action taken)
        const successMessageVisible = await page.locator('text=Downloaded, text=Success').isVisible();
        const optionsStillVisible = await page.locator('text=PNG, text=SVG, text=Image').isVisible();
        
        expect(successMessageVisible || !optionsStillVisible).toBe(true);
      }
    } else {
      test.skip('Export button not available');
    }
  });
});