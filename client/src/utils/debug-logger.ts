/**
 * Enhanced Debug Logging Utility
 * 
 * A collection of utilities for debugging React components
 * and providing detailed error tracking.
 */

// Deep object inspector that's safe against circular references
export function safeObjectInspect(obj: any, depth: number = 1): string {
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (typeof obj !== 'object') return String(obj);
  
  try {
    // Handle circular references
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      return value;
    }, 2);
  } catch (error) {
    return `[Error inspecting object: ${error}]`;
  }
}

// Safe mapping function that won't break with null/undefined arrays
export function safeMap<T, U>(arr: T[] | null | undefined, mapFn: (item: T, index: number) => U): U[] {
  if (!arr) {
    console.warn('safeMap called with null or undefined array');
    return [];
  }
  if (!Array.isArray(arr)) {
    console.warn(`safeMap expected array, got ${typeof arr}`);
    return [];
  }
  return arr.map(mapFn);
}

// Enhanced console logger with component context
export function createComponentLogger(componentName: string) {
  return {
    debug: (...args: any[]) => console.debug(`[${componentName}]`, ...args),
    log: (...args: any[]) => console.log(`[${componentName}]`, ...args),
    warn: (...args: any[]) => console.warn(`[${componentName}]`, ...args),
    error: (...args: any[]) => console.error(`[${componentName}]`, ...args),
    group: (label: string) => console.group(`[${componentName}] ${label}`),
    groupEnd: () => console.groupEnd(),
    
    // Data visualization
    inspectObject: (label: string, obj: any) => {
      console.group(`[${componentName}] ${label}`);
      console.log(safeObjectInspect(obj));
      console.groupEnd();
    },
    
    // Hook state logging
    logHookState: (hookName: string, state: any) => {
      console.log(`[${componentName}:${hookName}]`, state);
    },
    
    // Safe data structure verification 
    verifyData: (data: any, expectedKeys: string[]) => {
      if (!data) {
        console.warn(`[${componentName}] Data is null or undefined`);
        return false;
      }
      
      const missingKeys = expectedKeys.filter(key => !(key in data));
      if (missingKeys.length > 0) {
        console.warn(`[${componentName}] Missing expected keys:`, missingKeys);
        return false;
      }
      
      return true;
    }
  };
}

// Track all mapping operations to catch errors with proper context
export function instrumentedMap<T, U>(componentName: string, arrayName: string, arr: T[] | null | undefined, mapFn: (item: T, index: number) => U): U[] {
  if (!arr) {
    console.error(`[${componentName}] Attempted to map() on undefined/null array: ${arrayName}`);
    return [];
  }
  if (!Array.isArray(arr)) {
    console.error(`[${componentName}] Expected array for ${arrayName}, got ${typeof arr}`);
    return [];
  }
  
  try {
    return arr.map(mapFn);
  } catch (error) {
    console.error(`[${componentName}] Error mapping ${arrayName}:`, error);
    return [];
  }
}