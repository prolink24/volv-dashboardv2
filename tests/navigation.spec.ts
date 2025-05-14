import { test, expect } from '@playwright/test';

test.describe('Navigation and Responsiveness Tests', () => {
  test('should navigate between pages', async ({ page }) => {
    // Start at the dashboard
    await page.goto('/');
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    
    // Navigate to contacts
    await page.click('a:has-text("Contacts")');
    await expect(page.locator('h1:has-text("Contacts")')).toBeVisible();
    
    // Navigate to attribution
    await page.click('a:has-text("Attribution")');
    await expect(page.locator('h1:has-text("Attribution")')).toBeVisible();
    
    // Navigate to settings
    await page.click('a:has-text("Settings")');
    // Wait for settings page or submenu to appear
    await expect(page.locator('text=KPI Configuration')).toBeVisible();
    
    // Navigate to KPI configuration
    await page.click('a:has-text("KPI Configuration")');
    await expect(page.locator('h1:has-text("KPI Configuration")')).toBeVisible();
    
    // Return to dashboard
    await page.click('a:has-text("Dashboard")');
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
  });
  
  test('should be responsive on mobile viewports', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12 size
    
    // Check dashboard on mobile
    await page.goto('/');
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    
    // Check if mobile menu button is visible
    const mobileMenuButton = page.locator('button[aria-label="Toggle menu"]');
    await expect(mobileMenuButton).toBeVisible();
    
    // Open mobile menu
    await mobileMenuButton.click();
    
    // Verify navigation items are now visible
    await expect(page.locator('a:has-text("Contacts")')).toBeVisible();
    await expect(page.locator('a:has-text("Attribution")')).toBeVisible();
    
    // Navigate to contacts via mobile menu
    await page.click('a:has-text("Contacts")');
    await expect(page.locator('h1:has-text("Contacts")')).toBeVisible();
    
    // Check that contacts table is properly displayed on mobile
    await expect(page.locator('table')).toBeVisible();
  });
});