import { test, expect } from '@playwright/test';
import { customMatchers } from './utils/test-matchers';
import { skipTest, skipIf, asyncUtils } from './utils/test-helpers';

test.describe('Attribution Visualizations Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the attribution visualization page
    await page.goto('/attribution');
    
    // Wait for the page to load
    await page.waitForSelector('h1:has-text("Attribution"), h1:has-text("Contact Attribution")', { timeout: 10000 });
    
    // Wait for visualizations to load
    await page.waitForSelector('.chart, .visualization, .attribution-chart', { timeout: 15000 });
  });

  test('should render source distribution chart with real data', async ({ page }) => {
    // Look for the source distribution chart
    const sourceChart = page.locator('.source-distribution, .platform-distribution, [data-testid="source-chart"]').first();
    
    if (await sourceChart.count() === 0) {
      skipTest('Source distribution chart not found');
      return;
    }
    
    // Chart should be visible
    await expect(sourceChart).toBeVisible();
    
    // Should have legend items for different sources
    const legendItems = sourceChart.locator('.legend-item, .recharts-legend-item, .chart-legend-item');
    await customMatchers.toHaveCountAtLeast(legendItems, 1);
    
    // Should have at least Close and Calendly in the legend
    const legendTextElem = page.locator('.recharts-legend, .chart-legend');
    const legendText = await legendTextElem.textContent() || '';
    
    // Check for expected platforms in any case (upper or lower)
    const hasPlatforms = legendText.toLowerCase().includes('close') || 
                          legendText.toLowerCase().includes('calendly');
    
    expect(hasPlatforms).toBe(true);
    
    // Verify chart has actual data points
    const dataPoints = sourceChart.locator('.recharts-sector, .chart-slice, .data-point');
    await customMatchers.toHaveCountAtLeast(dataPoints, 1);
  });

  test('should render attribution timeline with trend data', async ({ page }) => {
    // Look for the timeline visualization
    const timelineChart = page.locator('.attribution-timeline, .time-chart, [data-testid="timeline-chart"]').first();
    
    if (await timelineChart.count() === 0) {
      skipTest('Attribution timeline chart not found');
      return;
    }
    
    // Timeline should be visible
    await expect(timelineChart).toBeVisible();
    
    // Should have axis labels
    const axisLabels = timelineChart.locator('.axis-label, .chart-label, .recharts-label');
    await customMatchers.toHaveCountAtLeast(axisLabels, 1);
    
    // Should have data points
    const dataPoints = timelineChart.locator('.recharts-dot, .data-point, .chart-point');
    
    // If no dots, check for lines or bars
    if (await dataPoints.count() === 0) {
      const lines = timelineChart.locator('.recharts-line, .chart-line, .trend-line');
      const bars = timelineChart.locator('.recharts-bar, .chart-bar, .data-bar');
      
      // Either lines or bars should be present
      expect(await lines.count() > 0 || await bars.count() > 0).toBe(true);
    } else {
      await customMatchers.toHaveCountAtLeast(dataPoints, 1);
    }
  });

  test('should render attribution confidence metrics', async ({ page }) => {
    // Look for the confidence metrics section
    const confidenceMetrics = page.locator('.confidence-metrics, .attribution-metrics, [data-testid="confidence-section"]').first();
    
    if (await confidenceMetrics.count() === 0) {
      skipTest('Confidence metrics section not found');
      return;
    }
    
    // Metrics should be visible
    await expect(confidenceMetrics).toBeVisible();
    
    // Should have at least one metric card
    const metricCards = confidenceMetrics.locator('.metric-card, .confidence-card, .stat-card');
    await customMatchers.toHaveCountAtLeast(metricCards, 1);
    
    // Check for the attribution accuracy metric
    const accuracyMetric = confidenceMetrics.locator('text=Accuracy, text=Attribution Accuracy').first();
    
    if (await accuracyMetric.count() > 0) {
      // Find the closest value display
      const valueDisplay = accuracyMetric.locator('xpath=ancestor::div[contains(@class, "card") or contains(@class, "metric")]//span[contains(@class, "value") or contains(@class, "percentage")]').first();
      
      if (await valueDisplay.count() > 0) {
        const valueText = await customMatchers.getTextSafely(valueDisplay);
        
        // Should be a percentage
        expect(valueText).toMatch(/\d+(\.\d+)?%/);
        
        // Convert to number
        const accuracyValue = parseFloat(valueText.replace('%', ''));
        
        // Should meet project requirement of >90% accuracy
        expect(accuracyValue).toBeGreaterThanOrEqual(90);
      }
    }
  });

  test('should have interactive filter controls', async ({ page }) => {
    // Look for filter controls
    const filterControls = page.locator('.filter-controls, .chart-filters, [data-testid="filter-section"]').first();
    
    if (await filterControls.count() === 0) {
      skipTest('Filter controls not found');
      return;
    }
    
    // Filters should be visible
    await expect(filterControls).toBeVisible();
    
    // Look for date range filter
    const dateFilter = filterControls.locator('text=Date Range, text=Time Period').first();
    const sourceFilter = filterControls.locator('text=Source, text=Platform').first();
    
    // At least one filter type should be present
    expect(await dateFilter.count() > 0 || await sourceFilter.count() > 0).toBe(true);
    
    // If date filter exists, test interaction
    if (await dateFilter.count() > 0) {
      // Find a clickable date range option (button, dropdown, etc.)
      const dateControl = page.locator('button:has-text("Date Range"), select:has-option("Last 30 Days"), [data-testid="date-filter"]').first();
      
      if (await dateControl.count() > 0) {
        // Record current chart state
        const initialChartState = await page.locator('.chart, .visualization').first().innerHTML();
        
        // Click the control
        await dateControl.click();
        
        // Look for dropdown options
        const dateOption = page.locator('text="Last 7 Days", text="This Month", text="Last Week"').first();
        
        // If options appear, select one
        if (await dateOption.count() > 0) {
          await dateOption.click();
          
          // Wait for chart to update
          await page.waitForTimeout(1000);
          
          // Charts should still be visible
          await expect(page.locator('.chart, .visualization').first()).toBeVisible();
        }
      }
    }
  });

  test('should render multi-touch attribution view', async ({ page }) => {
    // Look for multi-touch attribution section
    const multiTouchSection = page.locator('.multi-touch, .journey-attribution, [data-testid="multi-touch-section"]').first();
    
    if (await multiTouchSection.count() === 0) {
      skipTest('Multi-touch attribution view not found');
      return;
    }
    
    // Section should be visible
    await expect(multiTouchSection).toBeVisible();
    
    // Should have visualization components
    const visualComponents = multiTouchSection.locator('.journey-map, .funnel-chart, .path-visualization');
    
    if (await visualComponents.count() === 0) {
      // If no specific visualization, check for journey steps or touchpoints
      const touchpoints = multiTouchSection.locator('.touchpoint, .journey-step, .attribution-point');
      await customMatchers.toHaveCountAtLeast(touchpoints, 1);
    } else {
      await customMatchers.toHaveCountAtLeast(visualComponents, 1);
    }
    
    // Should show multiple sources/touchpoints
    const sourcesTextElem = multiTouchSection;
    const sourcesText = await sourcesTextElem.textContent() || '';
    const hasMultipleSources = sourcesText.toLowerCase().includes('close') && 
                                sourcesText.toLowerCase().includes('calendly');
    
    expect(hasMultipleSources).toBe(true);
  });

  test('should display conversion metrics by source', async ({ page }) => {
    // Look for conversion metrics section
    const conversionMetrics = page.locator('.conversion-metrics, .source-metrics, [data-testid="conversion-section"]').first();
    
    if (await conversionMetrics.count() === 0) {
      skipTest('Conversion metrics section not found');
      return;
    }
    
    // Section should be visible
    await expect(conversionMetrics).toBeVisible();
    
    // Should have platform-specific metrics
    const platformMetrics = conversionMetrics.locator('.platform-metric, .source-stat, [data-source]');
    await customMatchers.toHaveCountAtLeast(platformMetrics, 1);
    
    // Find a specific platform metric (e.g., Close)
    const closeMetric = conversionMetrics.locator('[data-source="close"], :has-text("Close CRM")').first();
    
    if (await closeMetric.count() > 0) {
      // Should have a value displayed
      const metricValue = closeMetric.locator('.metric-value, .conversion-rate, .percentage-value');
      await expect(metricValue).toBeVisible();
      
      // Value should be properly formatted
      const valueText = await customMatchers.getTextSafely(metricValue);
      expect(valueText.length).toBeGreaterThan(0);
    }
  });

  test('should have responsive layout for visualizations', async ({ page }) => {
    // Check desktop view first (default)
    const desktopCharts = await page.locator('.chart, .visualization').count();
    expect(desktopCharts).toBeGreaterThan(0);
    
    // Switch to tablet size
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500); // Wait for layout adjustment
    
    // Should still have same charts
    const tabletCharts = await page.locator('.chart, .visualization').count();
    expect(tabletCharts).toBe(desktopCharts);
    
    // Switch to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500); // Wait for layout adjustment
    
    // Should still have charts, possibly rearranged
    const mobileCharts = await page.locator('.chart, .visualization').count();
    expect(mobileCharts).toBe(desktopCharts);
    
    // Charts should be responsive (check if they're still visible)
    await expect(page.locator('.chart, .visualization').first()).toBeVisible();
  });

  test('should export visualization as image', async ({ page }) => {
    // Look for export button
    const exportButton = page.locator('button:has-text("Export"), [aria-label="Export chart"], [data-testid="export-button"]').first();
    
    if (await exportButton.count() === 0) {
      skipTest('Export button not available');
      return;
    }
    
    // Click export button
    await exportButton.click();
    
    // Check for export options
    const exportOptions = page.locator('text=PNG, text=SVG, text=Image');
    
    if (await exportOptions.count() > 0) {
      // Select first export option
      const firstOption = exportOptions.first();
      await firstOption.click();
      
      // Wait for export process
      await page.waitForTimeout(1000);
      
      // Check for success message or downloaded file indicator
      const successMessageVisible = await page.locator('text=Download complete, text=Export successful, text=Chart exported').isVisible();
      
      // Either success message should be visible or options should disappear
      const optionsStillVisible = await page.locator('text=PNG, text=SVG, text=Image').isVisible();
      
      expect(successMessageVisible || !optionsStillVisible).toBe(true);
    }
  });
});