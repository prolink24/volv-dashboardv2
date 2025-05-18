import { Router } from 'express';
import { storage } from '../storage';
import { z } from 'zod';

// Create a router for dashboard routes
const router = Router();

// Schema for validating date range query params
const dateRangeSchema = z.object({
  startDate: z.string()
    .refine(value => !isNaN(Date.parse(value)), { 
      message: 'Invalid start date format' 
    }),
  endDate: z.string()
    .refine(value => !isNaN(Date.parse(value)), { 
      message: 'Invalid end date format' 
    }),
  userId: z.string().optional(),
  includePreviousPeriod: z.enum(['true', 'false']).optional().default('false')
});

// GET /api/dashboard - Retrieve dashboard data with optional date range
router.get('/', async (req, res) => {
  try {
    // Extract and validate query params
    const result = dateRangeSchema.safeParse(req.query);
    
    if (!result.success) {
      return res.status(400).json({ 
        error: 'Invalid parameters', 
        details: result.error.format() 
      });
    }
    
    const { startDate, endDate, userId, includePreviousPeriod } = result.data;
    const dateRange = { 
      startDate: new Date(startDate), 
      endDate: new Date(endDate) 
    };
    
    // Fetch dashboard data from storage
    const dashboardData = await storage.getDashboardData(dateRange, userId);
    
    // If includePreviousPeriod is true, calculate the previous period as the same time span
    // but prior to the startDate
    if (includePreviousPeriod === 'true') {
      const timeSpanInMs = dateRange.endDate.getTime() - dateRange.startDate.getTime();
      const previousStartDate = new Date(dateRange.startDate.getTime() - timeSpanInMs);
      const previousEndDate = new Date(dateRange.endDate.getTime() - timeSpanInMs);
      
      const previousPeriodDateRange = {
        startDate: previousStartDate,
        endDate: previousEndDate
      };
      
      const previousPeriodData = await storage.getDashboardData(previousPeriodDateRange, userId);
      
      // Add previous period data for comparison
      dashboardData.previousPeriod = {
        totalContacts: previousPeriodData.totalContacts || 0,
        totalDeals: previousPeriodData.totalDeals || 0,
        totalRevenue: previousPeriodData.totalRevenue || 0,
        cashCollected: previousPeriodData.cashCollected || 0
      };
    }
    
    res.json(dashboardData);
  } catch (error) {
    console.error('Error retrieving dashboard data:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard data' });
  }
});

// GET /api/dashboard/deals - Retrieve deals data with optional date range
router.get('/deals', async (req, res) => {
  try {
    // Extract and validate query params
    const result = dateRangeSchema.safeParse(req.query);
    
    if (!result.success) {
      return res.status(400).json({ 
        error: 'Invalid parameters', 
        details: result.error.format() 
      });
    }
    
    const { startDate, endDate, userId } = result.data;
    const dateRange = { 
      startDate: new Date(startDate), 
      endDate: new Date(endDate) 
    };
    
    // Fetch deals data from storage
    const startDateString = dateRange.startDate.toISOString().split('T')[0];
    const endDateString = dateRange.endDate.toISOString().split('T')[0];
    const dealsData = await storage.getRecentDeals(100, startDateString, endDateString);
    
    // Process the deals data for dashboard display
    const processedDeals = dealsData.map(deal => ({
      id: deal.id,
      title: deal.title,
      value: parseFloat(deal.value || '0'),
      status: deal.status,
      closeDate: deal.closeDate,
      cashCollected: parseFloat(deal.cashCollected || '0'),
      assignedTo: deal.assignedTo
    }));
    
    res.json(processedDeals);
  } catch (error) {
    console.error('Error retrieving deals data:', error);
    res.status(500).json({ error: 'Failed to retrieve deals data' });
  }
});

// GET /api/dashboard/team - Retrieve team performance data
router.get('/team', async (req, res) => {
  try {
    // Extract and validate query params
    const result = dateRangeSchema.safeParse(req.query);
    
    if (!result.success) {
      return res.status(400).json({ 
        error: 'Invalid parameters', 
        details: result.error.format() 
      });
    }
    
    const { startDate, endDate } = result.data;
    const dateRange = { 
      startDate: new Date(startDate), 
      endDate: new Date(endDate) 
    };
    
    // Fetch team data from storage
    const dashboardData = await storage.getDashboardData(dateRange);
    const teamData = dashboardData.salesTeam || [];
    
    res.json(teamData);
  } catch (error) {
    console.error('Error retrieving team data:', error);
    res.status(500).json({ error: 'Failed to retrieve team data' });
  }
});

export default router;