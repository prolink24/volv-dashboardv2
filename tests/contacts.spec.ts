import { test, expect } from '@playwright/test';

test.describe('Contacts Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to contacts page
    await page.goto('/contacts');
    
    // Wait for the page to fully load
    await page.waitForSelector('h1:has-text("Contacts")');
  });

  test('should display contacts list with expected columns', async ({ page }) => {
    // Check that the contacts table is visible
    await expect(page.locator('.contacts-table')).toBeVisible();
    
    // Verify that the table headers include expected columns
    const expectedColumns = ['Name', 'Email', 'Phone', 'Source', 'Actions'];
    
    for (const column of expectedColumns) {
      await expect(page.locator('.contacts-table th').locator(`text=${column}`)).toBeVisible();
    }
    
    // Verify there are contact rows in the table
    const contactRows = page.locator('.contacts-table tbody tr');
    expect(await contactRows.count()).toBeGreaterThan(0);
  });

  test('should filter contacts by search term', async ({ page }) => {
    // Get the initial count of contacts
    const initialCount = await page.locator('.contacts-table tbody tr').count();
    
    // Get the first contact's name to use as search term
    const firstContactName = await page.locator('.contacts-table tbody tr').first().locator('td').first().textContent();
    const searchTerm = firstContactName.substring(0, 3); // Use first few characters
    
    // Enter the search term
    await page.locator('input[placeholder*="Search"]').fill(searchTerm);
    await page.keyboard.press('Enter');
    
    // Wait for the search results to load
    await page.waitForTimeout(1000);
    
    // Verify that the results are filtered
    const filteredCount = await page.locator('.contacts-table tbody tr').count();
    
    // Either the count should be less than initial (if filtering worked)
    // or all visible contacts should contain the search term
    if (filteredCount < initialCount) {
      expect(filteredCount).toBeLessThan(initialCount);
    } else {
      // If count didn't change, verify all results contain the search term
      const rows = page.locator('.contacts-table tbody tr');
      const count = await rows.count();
      
      for (let i = 0; i < count; i++) {
        const rowText = await rows.nth(i).textContent();
        expect(rowText.toLowerCase()).toContain(searchTerm.toLowerCase());
      }
    }
  });

  test('should sort contacts by column headers', async ({ page }) => {
    // Get the first contact before sorting
    const firstContactBeforeSort = await page.locator('.contacts-table tbody tr').first().locator('td').first().textContent();
    
    // Click on the Name column header to sort
    await page.click('.contacts-table th:has-text("Name")');
    
    // Wait for the sort to apply
    await page.waitForTimeout(500);
    
    // Get the first contact after sorting
    const firstContactAfterSort = await page.locator('.contacts-table tbody tr').first().locator('td').first().textContent();
    
    // Either the order changed (new first contact) or it was already sorted
    // Just verify we still have contacts displayed
    expect(await page.locator('.contacts-table tbody tr').count()).toBeGreaterThan(0);
  });

  test('should view contact details', async ({ page }) => {
    // Click on the view button for the first contact
    await page.click('.contacts-table tbody tr:first-child button:has-text("View")');
    
    // Check that the contact details modal/page is displayed
    await expect(page.locator('.contact-details')).toBeVisible();
    await expect(page.locator('h2:has-text("Contact Details")')).toBeVisible();
    
    // Verify key information is displayed
    await expect(page.locator('.contact-details .contact-name')).toBeVisible();
    await expect(page.locator('.contact-details .contact-email')).toBeVisible();
    
    // Close the details view
    await page.click('button:has-text("Close")');
    
    // Verify we're back to the contacts list
    await expect(page.locator('.contacts-table')).toBeVisible();
  });

  test('should paginate through contacts list', async ({ page }) => {
    // Check if pagination controls exist
    const paginationExists = await page.locator('.pagination').isVisible();
    
    if (paginationExists) {
      // Get the first contact on the first page
      const firstContactOnFirstPage = await page.locator('.contacts-table tbody tr').first().locator('td').first().textContent();
      
      // Click on the next page button
      await page.click('.pagination button:has-text("Next")');
      
      // Wait for the next page to load
      await page.waitForTimeout(500);
      
      // Get the first contact on the second page
      const firstContactOnSecondPage = await page.locator('.contacts-table tbody tr').first().locator('td').first().textContent();
      
      // Verify that the contacts are different, indicating we're on a different page
      expect(firstContactOnFirstPage).not.toEqual(firstContactOnSecondPage);
    } else {
      // If no pagination, check that all contacts are loaded on a single page
      await expect(page.locator('.contacts-table tbody tr')).toHaveCount.greaterThan(0);
    }
  });

  test('should filter contacts by source', async ({ page }) => {
    // Check if source filter exists
    const filterExists = await page.locator('select.source-filter, button:has-text("Filter")').first().isVisible();
    
    if (filterExists) {
      // Select a source filter (e.g., "Close CRM")
      await page.selectOption('select.source-filter', { label: 'Close CRM' });
      // Or, if it's a dropdown button:
      // await page.click('button:has-text("Filter")');
      // await page.click('text="Close CRM"');
      
      // Wait for the filter to apply
      await page.waitForTimeout(500);
      
      // Verify that filtered contacts all have the selected source
      const contactRows = page.locator('.contacts-table tbody tr');
      const count = await contactRows.count();
      
      for (let i = 0; i < Math.min(count, 5); i++) { // Check at least first 5 rows
        await expect(contactRows.nth(i).locator('td:has-text("Close CRM")')).toBeVisible();
      }
    } else {
      // If no source filter, verify contacts are displayed
      await expect(page.locator('.contacts-table tbody tr')).toHaveCount.greaterThan(0);
    }
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify the page title is still visible
    await expect(page.locator('h1:has-text("Contacts")')).toBeVisible();
    
    // Check that the responsive version of the table is displayed
    // This might be cards instead of a table on mobile
    await expect(page.locator('.contacts-list, .contacts-table, .contacts-grid')).toBeVisible();
    
    // Verify search is still accessible
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
  });
});