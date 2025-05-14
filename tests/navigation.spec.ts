import { test, expect } from '@playwright/test';

test.describe('Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page for each test
    await page.goto('/');
  });

  test('should navigate between main pages via the sidebar', async ({ page }) => {
    // Check we're on the dashboard page
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    
    // Navigate to Contacts page
    await page.click('a:has-text("Contacts")');
    await expect(page).toHaveURL(/.*\/contacts/);
    await expect(page.locator('h1:has-text("Contacts")')).toBeVisible();
    
    // Navigate to Attribution page
    await page.click('a:has-text("Attribution")');
    await expect(page).toHaveURL(/.*\/attribution/);
    await expect(page.locator('h1:has-text("Attribution")')).toBeVisible();
    
    // Navigate to Settings page
    await page.click('a:has-text("Settings")');
    await expect(page).toHaveURL(/.*\/settings/);
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible();
    
    // Navigate back to Dashboard
    await page.click('a:has-text("Dashboard")');
    await expect(page).toHaveURL('http://localhost:5000/');
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
  });

  test('should navigate to KPI Configuration page', async ({ page }) => {
    // Navigate to Settings first
    await page.click('a:has-text("Settings")');
    await expect(page).toHaveURL(/.*\/settings/);
    
    // Then to KPI Configuration
    await page.click('a:has-text("KPI Configuration")');
    await expect(page).toHaveURL(/.*\/settings\/kpi-configuration/);
    await expect(page.locator('h1:has-text("KPI Configuration")')).toBeVisible();
  });

  test('should check breadcrumb navigation', async ({ page }) => {
    // Navigate to KPI Configuration
    await page.click('a:has-text("Settings")');
    await page.click('a:has-text("KPI Configuration")');
    
    // Check breadcrumbs are displayed
    const breadcrumbs = page.locator('.breadcrumbs');
    await expect(breadcrumbs).toBeVisible();
    
    // Click on the Home breadcrumb
    await page.click('.breadcrumbs a:has-text("Home")');
    await expect(page).toHaveURL('http://localhost:5000/');
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
  });

  test('should preserve state between navigation actions', async ({ page }) => {
    // Navigate to Contacts page
    await page.click('a:has-text("Contacts")');
    
    // Interact with the page (e.g., filter contacts)
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('test');
    await page.keyboard.press('Enter');
    
    // Wait for the search to complete
    await page.waitForTimeout(1000);
    
    // Navigate to another page
    await page.click('a:has-text("Dashboard")');
    
    // Then back to Contacts
    await page.click('a:has-text("Contacts")');
    
    // Check if the search filter is still applied (state preserved)
    await expect(searchInput).toHaveValue('test');
  });

  test('should handle direct URL navigation', async ({ page }) => {
    // Navigate directly to different pages
    await page.goto('/contacts');
    await expect(page.locator('h1:has-text("Contacts")')).toBeVisible();
    
    await page.goto('/attribution');
    await expect(page.locator('h1:has-text("Attribution")')).toBeVisible();
    
    await page.goto('/settings/kpi-configuration');
    await expect(page.locator('h1:has-text("KPI Configuration")')).toBeVisible();
  });

  test('should have proper mobile navigation', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that the mobile menu button is visible
    const menuButton = page.locator('button[aria-label="Toggle menu"]');
    await expect(menuButton).toBeVisible();
    
    // Open the mobile menu
    await menuButton.click();
    
    // Check that navigation items are visible in the mobile menu
    await expect(page.locator('a:has-text("Contacts")')).toBeVisible();
    await expect(page.locator('a:has-text("Attribution")')).toBeVisible();
    await expect(page.locator('a:has-text("Settings")')).toBeVisible();
    
    // Navigate to Contacts using the mobile menu
    await page.click('a:has-text("Contacts")');
    await expect(page).toHaveURL(/.*\/contacts/);
    await expect(page.locator('h1:has-text("Contacts")')).toBeVisible();
  });
});