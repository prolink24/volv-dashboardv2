import { Locator, expect } from '@playwright/test';

export const customMatchers = {
  /**
   * Assert that a locator has at least the specified count of elements
   */
  async toHaveCountAtLeast(locator: Locator, minCount: number): Promise<void> {
    const count = await locator.count();
    expect(count, `Expected at least ${minCount} elements, but found ${count}`).toBeGreaterThanOrEqual(minCount);
  },
  
  /**
   * Assert that a locator is fully loaded (no loading spinners, contains expected content)
   */
  async toBeFullyLoaded(locator: Locator): Promise<void> {
    // Check if locator is visible
    await expect(locator).toBeVisible();
    
    // Check that no loading spinners are present
    const spinner = locator.locator('.loading, .spinner, .skeleton');
    const spinnerCount = await spinner.count();
    expect(spinnerCount, 'Expected no loading spinners').toBe(0);
    
    // Check that locator has some content (not empty)
    const hasContent = await locator.evaluate(element => {
      return element.textContent && element.textContent.trim().length > 0;
    });
    expect(hasContent, 'Expected element to have content').toBe(true);
  },

  /**
   * Assert that a locator has at most the specified count of elements
   */
  async toHaveCountAtMost(locator: Locator, maxCount: number): Promise<void> {
    const count = await locator.count();
    expect(count, `Expected at most ${maxCount} elements, but found ${count}`).toBeLessThanOrEqual(maxCount);
  },

  /**
   * Assert that a locator's text matches a regular expression pattern
   */
  async toMatchTextPattern(locator: Locator, pattern: RegExp): Promise<void> {
    const text = await locator.textContent() || '';
    expect(text, `Expected text to match pattern ${pattern}`).toMatch(pattern);
  },

  /**
   * Assert that a locator's text contains all of the specified substrings
   */
  async toContainAllText(locator: Locator, substrings: string[]): Promise<void> {
    const text = await locator.textContent() || '';
    for (const substring of substrings) {
      expect(text, `Expected text to contain "${substring}"`).toContain(substring);
    }
  },

  /**
   * Assert that a locator's text contains any of the specified substrings
   */
  async toContainAnyText(locator: Locator, substrings: string[]): Promise<void> {
    const text = await locator.textContent() || '';
    const containsAny = substrings.some(substring => text.includes(substring));
    expect(containsAny, `Expected text to contain any of ${JSON.stringify(substrings)}`).toBe(true);
  },

  /**
   * Assert that a locator's text is similar to the expected text (with some tolerance for differences)
   */
  async toHaveSimilarText(locator: Locator, expectedText: string, similarityThreshold: number = 0.8): Promise<void> {
    const actualText = await locator.textContent() || '';
    const similarity = this.calculateTextSimilarity(actualText, expectedText);
    expect(similarity, `Expected text similarity to be at least ${similarityThreshold}, but got ${similarity}`).toBeGreaterThanOrEqual(similarityThreshold);
  },

  /**
   * Calculate the similarity between two strings (0 to 1, with 1 being identical)
   * Uses Levenshtein distance normalized by the max length of the strings
   */
  calculateTextSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const maxLen = Math.max(len1, len2);
    
    if (maxLen === 0) return 1.0; // Both strings are empty
    
    // Calculate Levenshtein distance
    const distance = this.levenshteinDistance(str1, str2);
    
    // Return similarity as 1 - normalized distance
    return 1 - (distance / maxLen);
  },

  /**
   * Calculate the Levenshtein distance between two strings
   */
  levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    
    const matrix: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
    
    for (let i = 0; i <= len1; i++) {
      matrix[i][0] = i;
    }
    
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }
    
    return matrix[len1][len2];
  },

  /**
   * Safely get text from a locator, returning an empty string if null
   */
  async getTextSafely(locator: Locator): Promise<string> {
    return (await locator.textContent()) || '';
  },

  /**
   * Assert that a text has the expected format (numeric, date, percentage, etc.)
   */
  validateTextFormat(text: string, format: 'numeric' | 'date' | 'percentage' | 'currency' | 'email'): boolean {
    switch (format) {
      case 'numeric':
        return /^-?\d+(\.\d+)?$/.test(text);
      case 'date':
        return /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}|[A-Z][a-z]{2} \d{1,2},? \d{4}|\d{1,2} [A-Z][a-z]{2} \d{4}$/.test(text);
      case 'percentage':
        return /^-?\d+(\.\d+)?%$/.test(text);
      case 'currency':
        return /^[$€£¥][ ]?\d+(\.\d+)?([KkMmBb])?$/.test(text);
      case 'email':
        return /^[^@]+@[^@]+\.[^@]+$/.test(text);
      default:
        return false;
    }
  },

  /**
   * Assert that a locator has attributes with specific values
   */
  async toHaveAttributeValues(locator: Locator, attributes: Record<string, string>): Promise<void> {
    for (const [attr, expectedValue] of Object.entries(attributes)) {
      const actualValue = await locator.getAttribute(attr);
      expect(actualValue, `Expected attribute "${attr}" to have value "${expectedValue}"`).toBe(expectedValue);
    }
  },

  /**
   * Assert that a locator is in the viewport (visible area of the page)
   */
  async toBeInViewport(locator: Locator, page: any): Promise<void> {
    const isInViewport = await locator.evaluate(element => {
      const rect = element.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      );
    });
    
    expect(isInViewport, 'Expected element to be in viewport').toBe(true);
  },

  /**
   * Assert that the count of elements matches expected for responsive design
   * based on the current viewport size
   */
  async toHaveResponsiveCount(locator: Locator, page: any, config: {
    desktop: number,
    tablet: number,
    mobile: number
  }): Promise<void> {
    const viewport = page.viewportSize();
    let expected;
    
    if (viewport.width >= 1024) {
      expected = config.desktop;
    } else if (viewport.width >= 768) {
      expected = config.tablet;
    } else {
      expected = config.mobile;
    }
    
    const actual = await locator.count();
    expect(actual, `Expected ${expected} items for current viewport (${viewport.width}px), but found ${actual}`).toBe(expected);
  }
};