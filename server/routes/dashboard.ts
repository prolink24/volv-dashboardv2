import { Request, Response, Router } from 'express';
import { storage } from '../storage';
import { parseISO } from 'date-fns';

const router = Router();

/**
 * Dashboard API endpoint
 * 
 * This endpoint returns dashboard data for the specified date range.
 * It supports optional comparison with a previous period.
 */
async function getDashboardData(req: Request, res: Response) {
  try {
    // Extract query parameters
    const {
      startDate,
      endDate,
      compareStartDate,
      compareEndDate,
      userId
    } = req.query;
    
    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing required date parameters',
      });
    }

    // Parse date strings into Date objects
    const currentStartDate = typeof startDate === 'string' ? parseISO(startDate) : new Date();
    const currentEndDate = typeof endDate === 'string' ? parseISO(endDate) : new Date();
    
    // Get current period data
    const currentPeriodData = await storage.getDashboardData(
      { startDate: currentStartDate, endDate: currentEndDate }, 
      userId as string | undefined
    );
    
    // Check if we need to compare with previous period
    let previousPeriodData = null;
    if (compareStartDate && compareEndDate) {
      const compareStart = typeof compareStartDate === 'string' ? parseISO(compareStartDate) : null;
      const compareEnd = typeof compareEndDate === 'string' ? parseISO(compareEndDate) : null;
      
      if (compareStart && compareEnd) {
        previousPeriodData = await storage.getDashboardData(
          { startDate: compareStart, endDate: compareEnd },
          userId as string | undefined
        );
      }
    }
    
    // Return dashboard data
    return res.status(200).json({
      currentPeriod: currentPeriodData,
      previousPeriod: previousPeriodData
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return res.status(500).json({
      error: 'Failed to fetch dashboard data',
    });
  }
}

// Register routes
router.get('/', getDashboardData);

// Add other dashboard-related routes here
router.get('/sales-team', async (req: Request, res: Response) => {
  try {
    const { userId, startDate, endDate } = req.query;
    
    // Convert dates if provided
    const start = startDate ? parseISO(startDate as string) : new Date();
    const end = endDate ? parseISO(endDate as string) : new Date();
    
    // Fetch dashboard data with date range
    const data = await storage.getDashboardData(
      { startDate: start, endDate: end },
      userId as string | undefined
    );
    
    // Return just the sales team portion for this endpoint
    return res.status(200).json({
      salesTeam: data.salesTeam || []
    });
  } catch (error) {
    console.error('Error fetching sales team data:', error);
    return res.status(500).json({
      error: 'Failed to fetch sales team data',
    });
  }
});

// Add performance summary endpoint
router.get('/performance', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Convert dates if provided
    const start = startDate ? parseISO(startDate as string) : new Date();
    const end = endDate ? parseISO(endDate as string) : new Date();
    
    // Fetch dashboard data with date range
    const data = await storage.getDashboardData({ startDate: start, endDate: end });
    
    // Return performance metrics
    return res.status(200).json({
      totalContacts: data.totalContacts,
      totalDeals: data.totalDeals,
      totalRevenue: data.totalRevenue,
      totalCashCollected: data.totalCashCollected,
      conversionRate: data.conversionRate,
      cashCollectedRate: data.cashCollectedRate
    });
  } catch (error) {
    console.error('Error fetching performance data:', error);
    return res.status(500).json({
      error: 'Failed to fetch performance data',
    });
  }
});

// Export the router
export default router;