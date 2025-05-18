import express from 'express';
import { storage } from '../storage';
import { z } from 'zod';

const router = express.Router();

// Schema for validating dashboard query parameters
const dashboardQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  userId: z.string().optional(),
  comparePreviousPeriod: z.enum(['true', 'false']).optional().default('false'),
});

/**
 * GET /api/dashboard
 * 
 * Returns dashboard data filtered by date range and user
 * Can also include comparison data for previous period
 */
router.get('/', async (req, res) => {
  try {
    // Validate and parse query parameters
    const result = dashboardQuerySchema.safeParse(req.query);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: result.error.issues,
      });
    }
    
    const { startDate, endDate, userId, comparePreviousPeriod } = result.data;
    const shouldCompare = comparePreviousPeriod === 'true';
    
    // Parse dates or use default (current month)
    let start: Date, end: Date;
    
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Default to current month
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    
    // Get main dashboard data
    const dashboardData = await storage.getDashboardData({ 
      startDate: start, 
      endDate: end 
    }, userId || undefined);
    
    // If comparison is requested, get data for previous period
    let previousPeriodData = null;
    
    if (shouldCompare) {
      // Calculate previous period with same duration
      const duration = end.getTime() - start.getTime();
      const prevEnd = new Date(start.getTime() - 1); // Day before current start
      const prevStart = new Date(prevEnd.getTime() - duration);
      
      previousPeriodData = await storage.getDashboardData({
        startDate: prevStart,
        endDate: prevEnd
      }, userId || undefined);
    }
    
    // Return combined data
    res.json({
      ...dashboardData,
      previousPeriod: shouldCompare ? {
        totalContacts: previousPeriodData.totalContacts,
        totalDeals: previousPeriodData.totalDeals,
        totalActivities: previousPeriodData.totalActivities,
        totalMeetings: previousPeriodData.totalMeetings,
        totalRevenue: previousPeriodData.revenueGenerated,
        cashCollected: previousPeriodData.cashCollected
      } : undefined
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/dashboard/sales-team
 * 
 * Returns sales team performance data
 */
router.get('/sales-team', async (req, res) => {
  try {
    const result = dashboardQuerySchema.safeParse(req.query);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: result.error.issues,
      });
    }
    
    const { startDate, endDate } = result.data;
    
    // Parse dates or use default (current month)
    let start: Date, end: Date;
    
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Default to current month
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    
    // Get dashboard data which includes sales team performance
    const dashboardData = await storage.getDashboardData({ 
      startDate: start, 
      endDate: end 
    });
    
    res.json({
      salesTeam: dashboardData.salesTeam
    });
  } catch (error) {
    console.error('Error fetching sales team data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sales team data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;