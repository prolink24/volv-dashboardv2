import NodeCache from "node-cache";
import { Request, Response, NextFunction } from "express";

// Create cache instance with 15 minute default TTL
// Define cache options
const cacheOptions = {
  stdTTL: 900, // 15 minutes in seconds (increased from 5 minutes)
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false, // Store references instead of cloning for better performance
  deleteOnExpire: true, // Auto delete expired items
  maxKeys: 1000, // Limit maximum keys to prevent memory issues
};

const cache = new NodeCache(cacheOptions);

/**
 * Custom middleware to cache API responses
 * @param ttl - Time to live in seconds (default: use cache default)
 * @param keyGenerator - Function to generate cache key from request (default: uses URL+query)
 */
export function cacheMiddleware(ttl?: number, keyGenerator?: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests or if cache=false is in query
    if (req.method !== 'GET' || req.query.cache === 'false') {
      return next();
    }

    // Generate cache key
    const key = keyGenerator 
      ? keyGenerator(req) 
      : `${req.originalUrl || req.url}`;

    // Check if we have a cached response
    const cachedResponse = cache.get(key);
    
    if (cachedResponse) {
      console.log(`[CACHE] Hit for ${key}`);
      return res.json(cachedResponse);
    }

    // Store the original json method
    const originalSend = res.json;

    // Override res.json method
    res.json = function(body: any): Response {
      // Store in cache before sending
      if (res.statusCode === 200) {
        console.log(`[CACHE] Set for ${key}`);
        // Use the provided TTL or fall back to the default TTL
        const ttlValue: number = typeof ttl === 'number' ? ttl : cacheOptions.stdTTL;
        cache.set(key, body, ttlValue);
      }
      
      // Call the original json method
      return originalSend.call(this, body);
    };

    next();
  };
}

/**
 * Get a value from the cache
 * @param key - The cache key
 * @returns The cached value, or undefined if not found
 */
export function get(key: string): any {
  return cache.get(key);
}

/**
 * Set a value in the cache
 * @param key - The cache key
 * @param value - The value to cache
 * @param ttl - Optional time to live in seconds
 * @returns success - true if successful, false otherwise
 */
export function set(key: string, value: any, ttl?: number): boolean {
  try {
    const ttlValue: number = typeof ttl === 'number' ? ttl : cacheOptions.stdTTL;
    const result = cache.set(key, value, ttlValue);
    if (result) {
      console.log(`[CACHE] Manual set for ${key} with TTL ${ttlValue}s`);
    }
    return result;
  } catch (error) {
    console.error(`[CACHE] Error setting ${key}:`, error);
    return false;
  }
}

/**
 * Clear all or part of the cache
 * @param prefix - Optional prefix to only clear matching keys
 */
export function clearCache(prefix?: string): number {
  if (prefix) {
    // Delete only keys with matching prefix
    const keys = cache.keys().filter(key => key.startsWith(prefix));
    keys.forEach(key => cache.del(key));
    return keys.length;
  } else {
    // Delete all keys
    cache.flushAll();
    return cache.getStats().keys;
  }
}

/**
 * Get cache stats
 */
export function getCacheStats() {
  return {
    ...cache.getStats(),
    keys: cache.keys()
  };
}

export default {
  cache,
  cacheMiddleware,
  clearCache,
  getCacheStats,
  // Add direct access to get/set methods
  get,
  set
};