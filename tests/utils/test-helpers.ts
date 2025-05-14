import { test, expect } from '@playwright/test';

/**
 * Helper to skip a test with a message
 * @param message The reason for skipping the test
 */
export function skipTest(message: string): never {
  test.skip(true, message);
  // This line won't execute but is needed for TypeScript to understand this is a never-returning function
  throw new Error('Test skipped: ' + message);
}

/**
 * Conditionally skip a test based on a condition
 * @param condition If true, the test will be skipped
 * @param message The reason for skipping the test
 */
export function skipIf(condition: boolean, message: string): void {
  if (condition) {
    test.skip(true, message);
  }
}

/**
 * Asynchronous utility functions for tests
 */
export const asyncUtils = {
  /**
   * Wait for a condition to be true, with timeout
   * @param checkFn Function that returns true when condition is met
   * @param timeoutMs Maximum time to wait in milliseconds
   * @param intervalMs Check interval in milliseconds
   * @returns Promise that resolves when condition is met or rejects on timeout
   */
  async waitForCondition(
    checkFn: () => Promise<boolean> | boolean,
    timeoutMs: number = 10000, 
    intervalMs: number = 100
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      if (await Promise.resolve(checkFn())) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    throw new Error(`Condition not met within ${timeoutMs}ms timeout`);
  },
  
  /**
   * Retry a function until it succeeds or reaches max attempts
   * @param fn Function to retry
   * @param maxAttempts Maximum number of attempts
   * @param delayMs Delay between attempts in milliseconds
   * @param errorFilter Optional function to determine if an error should be retried
   * @returns Promise with the function result or throws the last error
   */
  async retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    delayMs: number = 1000,
    errorFilter?: (error: any) => boolean
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // If error filter exists and returns false, don't retry
        if (errorFilter && !errorFilter(error)) {
          throw error;
        }
        
        // If this was the last attempt, throw the error
        if (attempt === maxAttempts) {
          throw error;
        }
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    // This should never be reached due to the throw in the loop, but TypeScript needs it
    throw lastError;
  },
  
  /**
   * Poll an API endpoint until it returns expected data or times out
   * @param requestFn Function to make the API request
   * @param validateFn Function to validate the API response data
   * @param timeoutMs Maximum time to wait in milliseconds
   * @param intervalMs Poll interval in milliseconds
   * @returns Promise with the valid data or throws on timeout
   */
  async pollApiUntilValid<T>(
    requestFn: () => Promise<T>,
    validateFn: (data: T) => boolean,
    timeoutMs: number = 30000,
    intervalMs: number = 1000
  ): Promise<T> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const data = await requestFn();
        if (validateFn(data)) {
          return data;
        }
      } catch (error) {
        // Ignore errors and keep polling
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    throw new Error(`API did not return valid data within ${timeoutMs}ms timeout`);
  }
};

/**
 * Helpers for comparing values with expected values
 */
export const valueComparison = {
  /**
   * Check if a number is approximately equal to another number within a tolerance
   * @param actual The actual value
   * @param expected The expected value
   * @param tolerance The acceptable tolerance as a percentage (e.g. 5 for 5%)
   * @returns true if the values are approximately equal
   */
  isApproximately(actual: number, expected: number, tolerance: number = 5): boolean {
    const range = (tolerance / 100) * expected;
    return Math.abs(actual - expected) <= range;
  },
  
  /**
   * Round a floating point number to a specific number of decimal places
   * @param value The number to round
   * @param decimals The number of decimal places to round to
   * @returns The rounded number
   */
  roundTo(value: number, decimals: number = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  },
  
  /**
   * Format a number as a percentage string
   * @param value The number to format (e.g. 0.75)
   * @param decimals The number of decimal places to include
   * @returns The formatted percentage string (e.g. "75.00%")
   */
  formatPercent(value: number, decimals: number = 2): string {
    return (value * 100).toFixed(decimals) + '%';
  }
};

/**
 * Constants for testing
 */
export const testConstants = {
  // Known values from our application for validation
  ATTRIBUTION_ACCURACY: 91.85,
  TOTAL_CONTACTS: 4146,
  MULTI_SOURCE_RATE: 0,
  DEAL_ATTRIBUTION_RATE: 58.33,
  FIELD_COVERAGE: 100,
  
  // Viewport sizes for responsive testing
  VIEWPORT: {
    DESKTOP: { width: 1280, height: 800 },
    TABLET: { width: 768, height: 1024 },
    MOBILE: { width: 375, height: 667 }
  },
  
  // Test timeouts
  TIMEOUT: {
    SHORT: 5000,    // 5 seconds
    MEDIUM: 15000,  // 15 seconds
    LONG: 30000     // 30 seconds
  }
};

/**
 * Extract a specific property from an array of objects
 * @param array The array of objects
 * @param property The property to extract
 * @returns Array of property values
 */
export function extractProperty<T, K extends keyof T>(array: T[], property: K): T[K][] {
  return array.map(item => item[property]);
}