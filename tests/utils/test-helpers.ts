import { test as baseTest } from '@playwright/test';

/**
 * Helper to skip a test with a message
 */
export function skipTest(message?: string) {
  baseTest.skip(!!message, message || 'Test skipped');
}

/**
 * Helper to skip based on condition
 */
export function skipIf(condition: boolean, message?: string) {
  if (condition) {
    baseTest.skip(true, message || 'Test skipped due to condition');
  }
}

/**
 * Testing utilities for handling async operations
 */
export const asyncUtils = {
  /**
   * Sleep for the specified milliseconds
   */
  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * Retry an operation with exponential backoff
   */
  async retry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      initialDelay?: number;
      maxDelay?: number;
      retryFactor?: number;
      onRetry?: (attempt: number, delay: number) => void;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelay = 100,
      maxDelay = 5000,
      retryFactor = 2,
      onRetry
    } = options;
    
    let attempt = 0;
    let delay = initialDelay;
    
    while (true) {
      try {
        return await operation();
      } catch (error) {
        attempt++;
        if (attempt >= maxRetries) {
          throw error;
        }
        
        delay = Math.min(delay * retryFactor, maxDelay);
        if (onRetry) {
          onRetry(attempt, delay);
        }
        
        await asyncUtils.sleep(delay);
      }
    }
  },
  
  /**
   * Poll until a condition is true or timeout is reached
   */
  async pollUntil(
    condition: () => Promise<boolean>,
    options: {
      timeout?: number;
      interval?: number;
      message?: string;
    } = {}
  ): Promise<boolean> {
    const { timeout = 5000, interval = 100, message = 'Polling timed out' } = options;
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await asyncUtils.sleep(interval);
    }
    
    throw new Error(message);
  }
};