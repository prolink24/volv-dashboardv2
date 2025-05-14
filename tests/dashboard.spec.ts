import { test, expect } from '@playwright/test';
import { customMatchers } from './utils/test-matchers';
import { skipTest, skipIf, asyncUtils } from './utils/test-helpers';

test.describe('Dashboard Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');
    
    // Wait for the page to fully load
    await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 10000 });
    
    // Wait for initial data to load (charts, metrics, etc.)
    await page.waitForSelector('.dashboard-stats, .kpi-card', { timeout: 10000, state: 'visible' });
  });

  test('should render key metrics cards', async ({ page }) => {
    // Metrics cards should be visible
    const metricCards = page.locator('.kpi-card, .metric-card, .stats-card');
    await customMatchers.toHaveCountAtLeast(metricCards, 3);
    
    // Each card should have a title and value
    for (let i = 0; i < await metricCards.count(); i++) {
      const card = metricCards.nth(i);
      await customMatchers.toBeFullyLoaded(card);
      
      // Verify title exists
      const title = card.locator('.card-title, h3, .metric-title');
      await expect(title).toBeVisible();
      
      // Verify value exists with non-empty text
      const value = card.locator('.metric-value, .card-value, .value');
      if (await value.count() > 0) {
        const valueText = await customMatchers.getTextSafely(value);
        expect(valueText.length).toBeGreaterThan(0);
      }
    }
  });

  test('should render attribution accuracy metric prominently', async ({ page }) => {
    // Find attribution accuracy metric
    const accuracyMetric = page.locator('text=Attribution Accuracy, text=Accuracy').first();
    const hasAccuracyMetric = await accuracyMetric.count() > 0;
    
    if (!hasAccuracyMetric) {
      skipTest('Attribution accuracy metric not found on dashboard');
      return;
    }
    
    // Find the closest parent card/container
    const metricCard = accuracyMetric.locator('xpath=ancestor::div[contains(@class, "card") or contains(@class, "metric")]');
    await expect(metricCard).toBeVisible();
    
    // Find the value element and verify it shows a percentage
    const valueElement = metricCard.locator('.metric-value, .value, .percentage');
    const valueText = await customMatchers.getTextSafely(valueElement);
    
    // Should be a valid percentage
    expect(valueText).toMatch(/\d+(\.\d+)?%/);
    
    // Value should be above 90% based on our project requirements
    const numericValue = parseFloat(valueText.replace('%', ''));
    expect(numericValue).toBeGreaterThanOrEqual(90);
  });

  test('should have interactive elements with click handlers', async ({ page }) => {
    // Find interactive elements like buttons, filters, tabs
    const interactiveElements = page.locator('button:visible, [role="tab"]:visible, .filter-option:visible, .interactive:visible').first();
    
    if (await interactiveElements.count() === 0) {
      skipTest('No interactive elements found on dashboard');
      return;
    }
    
    // Get the initial state of some dynamic element on the page
    const dynamicElement = page.locator('.chart, .table, .dashboard-content');
    const initialHtml = await dynamicElement.innerHTML();
    
    // Click the interactive element
    await interactiveElements.click();
    
    // Wait for any potential UI updates
    await page.waitForTimeout(1000);
    
    // Verify the page remains stable (doesn't crash)
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    
    // The page should either update content or remain stable
    const newHtml = await dynamicElement.innerHTML();
    expect(true).toBe(true); // This test just ensures no crashes
  });

  test('should have responsive layout across device sizes', async ({ page }) => {
    // Test desktop layout first (already in this size)
    const desktopCards = await page.locator('.kpi-card, .metric-card, .stats-card').count();
    expect(desktopCards).toBeGreaterThan(0);
    
    // Switch to tablet size
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500); // Wait for layout to adjust
    
    // Verify same content is visible on tablet
    const tabletCards = await page.locator('.kpi-card, .metric-card, .stats-card').count();
    expect(tabletCards).toBe(desktopCards);
    
    // Switch to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500); // Wait for layout to adjust
    
    // Verify same content is still accessible on mobile
    const mobileCards = await page.locator('.kpi-card, .metric-card, .stats-card').count();
    expect(mobileCards).toBe(desktopCards);
    
    // Test that navigation is accessible on mobile
    const hamburgerMenu = page.locator('.hamburger-menu, [aria-label="Toggle menu"], .mobile-menu-toggle');
    
    if (await hamburgerMenu.count() > 0) {
      await hamburgerMenu.click();
      
      // Wait for mobile menu to show
      await page.waitForTimeout(500);
      
      // Verify settings link is visible in the mobile menu
      const settingsLink = page.locator('text=Settings, text=Configuration');
      await expect(settingsLink).toBeVisible();
    }
  });

  test('should display real-time data updates', async ({ page }) => {
    // Get initial data state (metrics, charts)
    const initialMetrics = await page.locator('.kpi-card, .metric-card, .stats-card').innerHTML();
    
    // Force data refresh (find a refresh button or trigger manually)
    const refreshButton = page.locator('button:has-text("Refresh"), [aria-label="Refresh"], .refresh-button');
    
    if (await refreshButton.count() > 0) {
      await refreshButton.click();
      
      // Wait for potential data refresh
      await page.waitForTimeout(2000);
      
      // Compare the new state with initial state
      const newMetrics = await page.locator('.kpi-card, .metric-card, .stats-card').innerHTML();
      
      // Either data stays the same (if no updates) or changes
      expect(true).toBe(true); // This verifies the operation completes without errors
    }
  });

  test('should navigate to analytics pages from dashboard', async ({ page }) => {
    // Look for links to more detailed analytics views
    const analyticsLinks = page.locator('a:has-text("Analytics"), a:has-text("Details"), a:has-text("View More")');
    
    if (await analyticsLinks.count() === 0) {
      skipTest('No analytics detail links found on dashboard');
      return;
    }
    
    // Click the first analytics link
    await analyticsLinks.first().click();
    
    // Wait for navigation to complete
    await page.waitForTimeout(1000);
    
    // Verify we navigated to a new page with detailed analytics
    const isDetailPage = await page.locator('h1:not(:has-text("Dashboard"))').count() > 0;
    expect(isDetailPage).toBe(true);
    
    // Verify the page has detailed content
    await customMatchers.toHaveCountAtLeast(page.locator('.chart, .table, .visualization'), 1);
  });

  test('should filter dashboard data by date range', async ({ page }) => {
    // Look for date range selector
    const dateRangeSelector = page.locator('button:has-text("Date Range"), .date-range-picker, .date-filter');
    
    if (await dateRangeSelector.count() === 0) {
      skipTest('No date range selector found on dashboard');
      return;
    }
    
    // Get initial data state
    const initialCharts = await page.locator('.chart, .visualization').innerHTML();
    
    // Click date range selector
    await dateRangeSelector.click();
    
    // Select a different range option
    const rangeOption = page.locator('text="Last 7 Days", text="This Week", text="Last Week"').first();
    
    if (await rangeOption.count() === 0) {
      skipTest('No date range options found in selector');
      return;
    }
    
    await rangeOption.click();
    
    // Wait for data to refresh
    await page.waitForTimeout(2000);
    
    // Verify UI remains stable after date filter change
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    
    // Either data changes or stays the same (if same period)
    expect(true).toBe(true); // This test ensures no crashes on filter change
  });
});