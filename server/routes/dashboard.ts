import { Request, Response, Router } from 'express';
import { storage } from '../storage';
import { parseISO, format } from 'date-fns';
import { db } from '../db';
import { and, eq, gte, lte, sql } from 'drizzle-orm';

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
      userId,
      role
    } = req.query;
    
    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required date parameters',
      });
    }

    // Parse date strings into Date objects
    const currentStartDate = typeof startDate === 'string' ? parseISO(startDate) : new Date();
    const currentEndDate = typeof endDate === 'string' ? parseISO(endDate) : new Date();
    
    // Log the request for debugging
    console.log(`Dashboard request for: ${format(currentStartDate, 'yyyy-MM-dd')} to ${format(currentEndDate, 'yyyy-MM-dd')}`);
    
    // Get current period data
    const currentPeriodData = await storage.getDashboardData(
      { startDate: currentStartDate, endDate: currentEndDate }, 
      userId as string | undefined,
      role as string | undefined
    );
    
    // Add diagnostic info to response
    currentPeriodData.success = true;
    currentPeriodData.requestedDateRange = {
      start: format(currentStartDate, 'yyyy-MM-dd'),
      end: format(currentEndDate, 'yyyy-MM-dd')
    };
    
    // Check if we need to compare with previous period
    let previousPeriodData = null;
    if (compareStartDate && compareEndDate) {
      const compareStart = typeof compareStartDate === 'string' ? parseISO(compareStartDate) : new Date();
      const compareEnd = typeof compareEndDate === 'string' ? parseISO(compareEndDate) : new Date();
      
      previousPeriodData = await storage.getDashboardData(
        { startDate: compareStart, endDate: compareEnd },
        userId as string | undefined,
        role as string | undefined
      );
      
      // Calculate changes and trends for KPIs
      if (previousPeriodData && currentPeriodData.kpis) {
        Object.keys(currentPeriodData.kpis).forEach(key => {
          if (previousPeriodData.kpis && previousPeriodData.kpis[key]) {
            const previous = previousPeriodData.kpis[key].current || 0;
            const current = currentPeriodData.kpis[key].current || 0;
            
            currentPeriodData.kpis[key].previous = previous;
            currentPeriodData.kpis[key].change = previous > 0 
              ? ((current - previous) / previous) * 100 
              : (current > 0 ? 100 : 0);
          }
        });
      }
      
      // Add comparison data to response
      currentPeriodData.comparison = {
        dateRange: {
          start: format(compareStart, 'yyyy-MM-dd'),
          end: format(compareEnd, 'yyyy-MM-dd')
        },
        metrics: previousPeriodData.metrics || {}
      };
    }
    
    // Return the complete dashboard data
    return res.json(currentPeriodData);
    
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
      message: error instanceof Error ? error.message : 'Unknown error'
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
    return res.json({
      success: true,
      salesTeam: data.salesTeam || []
    });
  } catch (error) {
    console.error('Error fetching sales team data:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sales team data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Add performance summary endpoint
router.get('/performance', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required date parameters',
      });
    }
    
    // Convert dates
    const start = parseISO(startDate as string);
    const end = parseISO(endDate as string);
    
    // Fetch dashboard data with date range
    const data = await storage.getDashboardData({ startDate: start, endDate: end });
    
    // Extract and format performance data
    const performanceData = data.salesTeam || [];
    
    return res.json({
      success: true,
      performance: performanceData.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        metrics: {
          revenue: user.metrics?.revenue || 0,
          deals: user.metrics?.deals || 0,
          contacts: user.metrics?.contacts || 0,
          meetings: user.metrics?.meetings || 0
        }
      }))
    });
  } catch (error) {
    console.error('Error fetching performance data:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch performance data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Export the router
export default router;