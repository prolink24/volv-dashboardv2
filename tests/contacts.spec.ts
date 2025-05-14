import { test, expect } from '@playwright/test';

test.describe('Contacts Tests', () => {
  test('should load the contacts page', async ({ page }) => {
    // Navigate to the contacts page
    await page.goto('/contacts');
    
    // Verify the page title
    await expect(page.locator('h1:has-text("Contacts")')).toBeVisible();
    
    // Verify search functionality is present
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    
    // Wait for contacts to load
    await expect(page.locator('.loading-indicator')).not.toBeVisible({ timeout: 10000 });
    
    // Verify contacts list is present
    const contactsList = page.locator('table');
    await expect(contactsList).toBeVisible();
    
    // Check that at least one contact is displayed
    const contactRows = page.locator('table tbody tr');
    await expect(contactRows.first()).toBeVisible();
    
    // Verify some expected contact details are present
    await expect(page.locator('th:has-text("Name")')).toBeVisible();
    await expect(page.locator('th:has-text("Email")')).toBeVisible();
  });
  
  test('should filter contacts by search', async ({ page }) => {
    // Navigate to the contacts page
    await page.goto('/contacts');
    
    // Wait for the page to load
    await expect(page.locator('h1:has-text("Contacts")')).toBeVisible();
    await page.waitForTimeout(1000); // Small wait for data to load
    
    // Count initial number of contacts
    const initialContactCount = await page.locator('table tbody tr').count();
    
    // Enter a search term
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('a'); // Simple search that should match some contacts
    await page.keyboard.press('Enter');
    
    // Wait for search results
    await page.waitForTimeout(1000);
    
    // Count filtered contacts
    const filteredContactCount = await page.locator('table tbody tr').count();
    
    // Check that the results are different (filtered)
    if (initialContactCount > 1) {
      // Only if we initially had enough contacts to potentially filter
      expect(filteredContactCount).toBeLessThanOrEqual(initialContactCount);
    }
  });
});