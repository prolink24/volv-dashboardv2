import NodeCache from "node-cache";
import { Request, Response, NextFunction } from "express";

// Create cache instance with 5 minute TTL default
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes in seconds
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false, // Store references instead of cloning for better performance
  deleteOnExpire: true, // Auto delete expired items
});

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
        cache.set(key, body, ttl || undefined);
      }
      
      // Call the original json method
      return originalSend.call(this, body);
    };

    next();
  };
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
  getCacheStats
};