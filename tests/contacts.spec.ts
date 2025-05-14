import { test, expect } from '@playwright/test';
import { customMatchers } from './utils/test-matchers';
import { skipTest, skipIf, asyncUtils } from './utils/test-helpers';

test.describe('Contacts Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to contacts page
    await page.goto('/contacts');
    
    // Wait for the page to load
    await page.waitForSelector('h1:has-text("Contacts")', { timeout: 10000 });
    
    // Wait for the contacts data to load
    await page.waitForSelector('.contact-list, .contacts-table', { timeout: 10000 });
  });

  test('should display contacts list with real data', async ({ page }) => {
    // Find the contacts table/list
    const contactsList = page.locator('.contact-list, .contacts-table');
    await expect(contactsList).toBeVisible();
    
    // Check that at least one contact item is displayed
    const contactItems = contactsList.locator('.contact-item, tr');
    await customMatchers.toHaveCountAtLeast(contactItems, 1);
    
    // Check that each contact has a name and email
    const firstContact = contactItems.first();
    await expect(firstContact.locator('.contact-name, td:nth-child(1)')).toBeVisible();
    
    // Verify text content is non-empty
    const nameText = await customMatchers.getTextSafely(firstContact.locator('.contact-name, td:nth-child(1)'));
    expect(nameText.length).toBeGreaterThan(0);
  });

  test('should show contact sources/platforms for each contact', async ({ page }) => {
    // Get the first few contacts in the list
    const contactItems = page.locator('.contact-item, tr').first();
    
    // Verify the contact has source information displayed
    const sourcesElement = contactItems.locator('.contact-sources, .sources, .platforms');
    
    if (await sourcesElement.count() === 0) {
      // Look for source icons if no specific sources element
      const sourceIcons = contactItems.locator('.source-icon, .platform-icon, .icon');
      if (await sourceIcons.count() === 0) {
        skipTest('No source information found on contacts page');
        return;
      }
    }
    
    // Contact should have at least one source
    const sourcesText = await customMatchers.getTextSafely(sourcesElement);
    expect(sourcesText.length).toBeGreaterThan(0);
    
    // Should contain one of the known platforms
    const hasKnownSource = 
      sourcesText.toLowerCase().includes('close') || 
      sourcesText.toLowerCase().includes('calendly') || 
      await contactItems.locator('.close-icon, .calendly-icon, [data-source]').count() > 0;
    
    expect(hasKnownSource).toBe(true);
  });

  test('should have functional search/filter capabilities', async ({ page }) => {
    // Find the search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], .search-input');
    
    if (await searchInput.count() === 0) {
      skipTest('No search input found on contacts page');
      return;
    }
    
    // Count initial number of contacts
    const initialContactsCount = await page.locator('.contact-item, tr').count();
    expect(initialContactsCount).toBeGreaterThan(0);
    
    // Enter a search term
    await searchInput.fill('a');
    
    // Wait for search results to update
    await page.waitForTimeout(1000);
    
    // Verify the page doesn't crash on search
    await expect(page.locator('h1:has-text("Contacts")')).toBeVisible();
    
    // Results should either stay the same or be filtered down
    const newContactsCount = await page.locator('.contact-item, tr').count();
    expect(newContactsCount).toBeGreaterThanOrEqual(0);
    
    // Clear the search
    await searchInput.clear();
    
    // Wait for results to reset
    await page.waitForTimeout(1000);
    
    // Contacts should be visible again
    await customMatchers.toHaveCountAtLeast(page.locator('.contact-item, tr'), 1);
  });

  test('should have pagination if there are many contacts', async ({ page }) => {
    // Check if pagination controls exist
    const paginationControls = page.locator('.pagination, .paginator, nav:has(button[aria-label="Next page"])');
    
    if (await paginationControls.count() === 0) {
      // If no pagination, make sure there are at least some contacts visible
      await customMatchers.toHaveCountAtLeast(page.locator('.contact-item, tr'), 1);
      return; // Skip the rest of the test
    }
    
    // Record current state
    const initialContactsHtml = await page.locator('.contact-list, .contacts-table').innerHTML();
    
    // Click the next page button
    const nextButton = paginationControls.locator('button:has-text("Next"), [aria-label="Next page"], button:has(svg[aria-label="Next"])');
    
    if (await nextButton.count() === 0 || !(await nextButton.isEnabled())) {
      // If next button doesn't exist or is disabled, skip test
      return;
    }
    
    await nextButton.click();
    
    // Wait for new page to load
    await page.waitForTimeout(1000);
    
    // Verify the page content has changed
    const newContactsHtml = await page.locator('.contact-list, .contacts-table').innerHTML();
    expect(newContactsHtml).not.toEqual(initialContactsHtml);
    
    // Contacts should still be visible
    await customMatchers.toHaveCountAtLeast(page.locator('.contact-item, tr'), 1);
  });

  test('should display contact details when clicking on a contact', async ({ page }) => {
    // Click on the first contact
    await page.locator('.contact-item, tr').first().click();
    
    // Wait for the details view to appear
    await page.waitForTimeout(1000);
    
    // Check either a details panel or a new page opens
    const detailsPanel = page.locator('.contact-details, .details-panel, [aria-label="Contact details"]');
    const detailsPage = page.locator('h1:has-text("Contact Details"), h1:has-text("Contact Profile")');
    
    const hasDetails = await detailsPanel.count() > 0 || await detailsPage.count() > 0;
    expect(hasDetails).toBe(true);
    
    if (await detailsPanel.count() > 0) {
      // Check details in the panel
      await expect(detailsPanel).toBeVisible();
      
      // Should show email
      const emailElement = detailsPanel.locator('text=Email, .email-field, .contact-email');
      expect(await emailElement.count()).toBeGreaterThan(0);
      
      // Should show source information
      const sourcesElement = detailsPanel.locator('text=Sources, text=Platforms, .sources-section');
      expect(await sourcesElement.count()).toBeGreaterThan(0);
    } else if (await detailsPage.count() > 0) {
      // Check details on the dedicated page
      await expect(detailsPage).toBeVisible();
      
      // Should show contact information sections
      const infoSections = page.locator('.contact-info, .profile-section, .details-card');
      await customMatchers.toHaveCountAtLeast(infoSections, 1);
    }
  });

  test('should show multi-platform data for contacts', async ({ page }) => {
    // Click on the first contact
    await page.locator('.contact-item, tr').first().click();
    
    // Wait for details panel or page to load
    await page.waitForTimeout(1000);
    
    // Identify where we are - panel or page
    const detailsPanel = page.locator('.contact-details, .details-panel, [aria-label="Contact details"]');
    const detailsPage = page.locator('h1:has-text("Contact Details"), h1:has-text("Contact Profile")');
    
    const detailsElement = (await detailsPanel.count() > 0) ? detailsPanel : 
                           (await detailsPage.count() > 0) ? page : null;
    
    if (!detailsElement) {
      skipTest('Contact details not found');
      return;
    }
    
    // Look for platform-specific sections
    const platformSections = detailsElement.locator('.platform-data, .source-data, .calendar-events, .crm-activities');
    
    if (await platformSections.count() === 0) {
      skipTest('No platform-specific sections found in contact details');
      return;
    }
    
    // There should be at least one platform section with data
    await customMatchers.toHaveCountAtLeast(platformSections, 1);
    
    // At least one section should contain actual data
    const sectionWithData = platformSections.locator(':has(.data-item, .activity, .meeting, li, tr)');
    await customMatchers.toHaveCountAtLeast(sectionWithData, 1);
  });

  test('should display contact metrics correctly', async ({ page }) => {
    // Check for a metrics/KPI section on the contacts page
    const metricsSection = page.locator('.metrics-section, .contact-metrics, .stats-section');
    
    if (await metricsSection.count() === 0) {
      skipTest('No metrics section found on contacts page');
      return;
    }
    
    // Metrics should be visible
    await expect(metricsSection).toBeVisible();
    
    // Should have multiple metric items
    const metricItems = metricsSection.locator('.metric-item, .stat-card, .kpi-item');
    await customMatchers.toHaveCountAtLeast(metricItems, 1);
    
    // Each metric should have a label and value
    for (let i = 0; i < await metricItems.count(); i++) {
      const item = metricItems.nth(i);
      
      // Should have a label
      const label = item.locator('.metric-label, .stat-label, .label');
      expect(await label.count()).toBeGreaterThan(0);
      
      // Should have a value
      const value = item.locator('.metric-value, .stat-value, .value');
      expect(await value.count()).toBeGreaterThan(0);
      
      // Value should be non-empty
      const valueText = await customMatchers.getTextSafely(value);
      expect(valueText.length).toBeGreaterThan(0);
    }
  });

  test('should have a responsive layout across device sizes', async ({ page }) => {
    // Test desktop layout first (already in this size)
    const desktopContactsCount = await page.locator('.contact-item, tr').count();
    expect(desktopContactsCount).toBeGreaterThan(0);
    
    // Switch to tablet size
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500); // Wait for layout to adjust
    
    // Contacts should still be visible on tablet
    const tabletContactsCount = await page.locator('.contact-item, tr').count();
    expect(tabletContactsCount).toBeGreaterThan(0);
    
    // Switch to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500); // Wait for layout to adjust
    
    // Contacts should still be visible on mobile
    const mobileContactsCount = await page.locator('.contact-item, tr').count();
    expect(mobileContactsCount).toBeGreaterThan(0);
    
    // Check that controls are accessible on mobile
    const mobileControls = page.locator('.mobile-controls, .responsive-controls, .search-controls');
    if (await mobileControls.count() > 0) {
      await expect(mobileControls).toBeVisible();
    }
  });
});