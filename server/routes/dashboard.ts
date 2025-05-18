import { Request, Response } from 'express';
import { storage } from '../storage';
import { parseISO } from 'date-fns';

/**
 * Dashboard API endpoint
 * 
 * This endpoint returns dashboard data for the specified date range.
 * It supports optional comparison with a previous period.
 */
export async function getDashboardData(req: Request, res: Response) {
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
      currentStartDate,
      currentEndDate, 
      userId as string | undefined
    );
    
    // Check if we need to compare with previous period
    let previousPeriodData = null;
    if (compareStartDate && compareEndDate) {
      const compareStart = typeof compareStartDate === 'string' ? parseISO(compareStartDate) : null;
      const compareEnd = typeof compareEndDate === 'string' ? parseISO(compareEndDate) : null;
      
      if (compareStart && compareEnd) {
        previousPeriodData = await storage.getDashboardData(
          compareStart,
          compareEnd,
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