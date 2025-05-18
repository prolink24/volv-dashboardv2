import { Request, Response, Router } from 'express';
import { storage } from '../storage';
import NodeCache from 'node-cache';

const router = Router();
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

// Cache middleware
const cacheService = {
  cacheMiddleware: (duration: number) => {
    return (req: Request, res: Response, next: Function) => {
      // Skip caching if explicitly requested
      if (req.query.skipCache === 'true') {
        return next();
      }

      // Create a cache key from the request path and query params
      const cacheKey = `${req.originalUrl}`;
      const cachedResponse = cache.get(cacheKey);

      if (cachedResponse) {
        return res.json(cachedResponse);
      } else {
        // Replace the res.json method to intercept the response
        const originalJson = res.json;
        res.json = function(body) {
          cache.set(cacheKey, body, duration);
          return originalJson.call(this, body);
        };
        next();
      }
    };
  },
  clearCache: () => {
    cache.flushAll();
  }
};

/**
 * GET /api/dashboard
 * 
 * Fetches dashboard data based on date range and user filters
 * Query parameters:
 * - startDate: start of date range (ISO string)
 * - endDate: end of date range (ISO string)
 * - userId: optional user ID to filter by
 * - previousStartDate: optional previous period start for comparison
 * - previousEndDate: optional previous period end for comparison
 */
router.get('/', cacheService.cacheMiddleware(300), async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const userId = req.query.userId as string | undefined;
    const previousStartDate = req.query.previousStartDate ? new Date(req.query.previousStartDate as string) : undefined;
    const previousEndDate = req.query.previousEndDate ? new Date(req.query.previousEndDate as string) : undefined;
    
    // Validate date range
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Invalid date range' });
    }
    
    // Fetch dashboard data for current period
    const dashboardData = await storage.getDashboardData(startDate, endDate, userId);
    
    // Format the response
    const response: any = {
      currentPeriod: {
        totalContacts: dashboardData.totalContacts || 0,
        totalRevenue: dashboardData.totalRevenue || 0,
        totalCashCollected: dashboardData.totalCashCollected || 0,
        totalDeals: dashboardData.totalDeals || 0,
        totalMeetings: dashboardData.totalMeetings || 0,
        totalActivities: dashboardData.totalActivities || 0,
        conversionRate: dashboardData.conversionRate || 0,
        multiSourceRate: dashboardData.multiSourceRate || 0,
        cashCollectedRate: dashboardData.cashCollectedRate || 0,
        salesTeam: dashboardData.salesTeam || []
      }
    };
    
    // If previous period is requested, fetch data for it
    if (previousStartDate && previousEndDate) {
      const previousData = await storage.getDashboardData(previousStartDate, previousEndDate, userId);
      
      response.previousPeriod = {
        totalContacts: previousData.totalContacts || 0,
        totalRevenue: previousData.totalRevenue || 0,
        totalCashCollected: previousData.totalCashCollected || 0,
        totalDeals: previousData.totalDeals || 0,
        totalMeetings: previousData.totalMeetings || 0,
        totalActivities: previousData.totalActivities || 0,
        conversionRate: previousData.conversionRate || 0,
        multiSourceRate: previousData.multiSourceRate || 0,
        cashCollectedRate: previousData.cashCollectedRate || 0,
        salesTeam: previousData.salesTeam || []
      };
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

/**
 * POST /api/dashboard/clear-cache
 * 
 * Clears the dashboard cache
 */
router.post('/clear-cache', async (req: Request, res: Response) => {
  try {
    cacheService.clearCache();
    res.json({ success: true, message: 'Dashboard cache cleared successfully' });
  } catch (error) {
    console.error('Error clearing dashboard cache:', error);
    res.status(500).json({ error: 'Failed to clear dashboard cache' });
  }
});

export default router;