import { expect, Locator } from '@playwright/test';

/**
 * Custom matchers for Playwright tests
 */
export const customMatchers = {
  /**
   * Asserts that a locator has at least the expected number of elements.
   */
  async toHaveCountAtLeast(locator: Locator, expectedCount: number): Promise<void> {
    const actualCount = await locator.count();
    expect(actualCount).toBeGreaterThanOrEqual(expectedCount);
  },

  /**
   * Gets text from a locator with error handling
   */
  async getTextSafely(locator: Locator): Promise<string> {
    try {
      return await locator.textContent() || '';
    } catch (error) {
      console.error('Error getting text from locator:', error);
      return '';
    }
  },

  /**
   * Checks if a locator contains any element with the specified text
   */
  async containsText(locator: Locator, text: string): Promise<boolean> {
    try {
      await locator.locator(`text=${text}`).first().waitFor({ state: 'visible', timeout: 1000 });
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Waits for an element to have specific attributes
   */
  async toHaveAttributes(locator: Locator, attributes: Record<string, string>, timeout = 5000): Promise<void> {
    await expect(async () => {
      for (const [attr, value] of Object.entries(attributes)) {
        const actualValue = await locator.getAttribute(attr);
        expect(actualValue).toBe(value);
      }
    }).toPass({ timeout });
  },

  /**
   * Waits for an element to have a class
   */
  async toHaveClass(locator: Locator, className: string, timeout = 5000): Promise<void> {
    await expect(async () => {
      const classes = await locator.getAttribute('class') || '';
      const classNames = classes.split(/\s+/);
      expect(classNames).toContain(className);
    }).toPass({ timeout });
  },

  /**
   * Verifies element has loaded properly
   */
  async toBeFullyLoaded(locator: Locator): Promise<void> {
    // Verify it's visible
    await expect(locator).toBeVisible();
    
    // Verify it has content if it's supposed to have text
    const hasText = ['h1', 'h2', 'h3', 'h4', 'p', 'span', 'div', 'button', 'a', 'label'];
    const tagName = await locator.evaluate(el => el.tagName.toLowerCase());
    
    if (hasText.includes(tagName)) {
      const text = await locator.textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    }
    
    // For images, verify they're loaded
    if (tagName === 'img') {
      await expect(locator).toHaveJSProperty('complete', true);
    }
  },

  /**
   * Checks if the element is in viewport
   */
  async toBeInViewport(locator: Locator): Promise<void> {
    const isVisible = await locator.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      );
    });
    
    expect(isVisible).toBe(true);
  }
};