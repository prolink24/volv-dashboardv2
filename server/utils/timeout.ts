/**
 * Timeout utility for managing long-running operations
 */

/**
 * Execute a promise with a timeout, returning the original promise result
 * or throwing an error if the timeout is reached
 * 
 * @param promise The promise to execute
 * @param timeoutMs Timeout in milliseconds
 * @param errorMessage Optional custom error message
 * @returns The promise result or throws an error on timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });
  
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result as T;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Execute a promise with a timeout, returning the original promise result
 * or a fallback value if the timeout is reached (no error thrown)
 * 
 * @param promise The promise to execute
 * @param timeoutMs Timeout in milliseconds
 * @param fallbackValue The value to return if timeout is reached
 * @returns The promise result or the fallback value
 */
export async function withTimeoutFallback<T>(
  promise: Promise<T>, 
  timeoutMs: number,
  fallbackValue: T
): Promise<T> {
  try {
    return await withTimeout(promise, timeoutMs);
  } catch (error) {
    if (error instanceof Error && error.message.includes('timed out')) {
      console.warn(`Operation timed out after ${timeoutMs}ms, using fallback value`);
      return fallbackValue;
    }
    throw error;
  }
}