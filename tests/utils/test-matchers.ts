import { expect, Page, Locator } from '@playwright/test';

/**
 * Custom matchers to extend Playwright's expect functionality
 */
export const customMatchers = {
  /**
   * Checks if the count of elements matching a locator is at least the specified value
   */
  async toHaveCountAtLeast(locator: Locator, expected: number): Promise<void> {
    const count = await locator.count();
    expect(count).toBeGreaterThanOrEqual(expected);
  },
  
  /**
   * Checks if the count of elements matching a locator is greater than the specified value
   */
  async toHaveCountGreaterThan(locator: Locator, expected: number): Promise<void> {
    const count = await locator.count();
    expect(count).toBeGreaterThan(expected);
  },
  
  /**
   * Gets text content safely, returning empty string if null
   */
  async getTextSafely(locator: Locator): Promise<string> {
    const text = await locator.textContent();
    return text || '';
  },
  
  /**
   * Safely gets a bounding box, throwing a descriptive error if null
   */
  async getBoundingBoxSafe(locator: Locator, description: string): Promise<{x: number, y: number, width: number, height: number}> {
    const box = await locator.boundingBox();
    if (!box) {
      throw new Error(`Failed to get bounding box for ${description}`);
    }
    return box;
  },
  
  /**
   * Compare vertical positions of two elements
   */
  async checkVerticalStacking(topLocator: Locator, bottomLocator: Locator): Promise<void> {
    const topBox = await topLocator.boundingBox();
    const bottomBox = await bottomLocator.boundingBox();
    
    if (!topBox || !bottomBox) {
      throw new Error('Failed to get bounding boxes for elements');
    }
    
    expect(bottomBox.y).toBeGreaterThan(topBox.y + topBox.height - 5);
  }
};

/**
 * Helper functions to collect and log test results
 */
export interface TestResult {
  name: string;
  duration: number;
  status: 'pass' | 'fail';
  error?: string;
}

export class TestResultCollector {
  private results: TestResult[] = [];
  
  addResult(result: TestResult): void {
    this.results.push(result);
  }
  
  logResults(): void {
    console.table(this.results);
    
    // Calculate statistics
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'pass').length;
    const failedTests = totalTests - passedTests;
    const passRate = (passedTests / totalTests) * 100;
    
    console.log(`
Test Summary:
  Total Tests: ${totalTests}
  Passed: ${passedTests}
  Failed: ${failedTests}
  Pass Rate: ${passRate.toFixed(2)}%
    `);
  }
}