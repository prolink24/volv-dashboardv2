import { Request, Response } from 'express';
import { storage } from '../storage';

/**
 * GET /api/dashboard
 * Fetches dashboard data for the given date range and user filter
 */
export async function getDashboardData(req: Request, res: Response) {
  try {
    const { 
      startDate, 
      endDate, 
      userId,
      previousStartDate,
      previousEndDate
    } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Missing required parameters: startDate and endDate are required' 
      });
    }

    // Parse date strings to Date objects
    const currentPeriodStart = new Date(startDate as string);
    const currentPeriodEnd = new Date(endDate as string);

    // Get current period data
    const currentPeriodData = await storage.getDashboardData(
      currentPeriodStart,
      currentPeriodEnd,
      userId as string | undefined
    );
    
    // Get previous period data if requested
    let previousPeriodData = null;
    if (previousStartDate && previousEndDate) {
      const prevStart = new Date(previousStartDate as string);
      const prevEnd = new Date(previousEndDate as string);
      
      previousPeriodData = await storage.getDashboardData(
        prevStart,
        prevEnd,
        userId as string | undefined
      );
    }

    // Format response based on whether previous period data was requested
    const response = {
      currentPeriod: {
        totalContacts: currentPeriodData.totalContacts,
        totalRevenue: currentPeriodData.totalRevenue,
        totalCashCollected: currentPeriodData.totalCashCollected,
        totalDeals: currentPeriodData.totalDeals,
        totalMeetings: currentPeriodData.totalMeetings,
        totalActivities: currentPeriodData.totalActivities,
        conversionRate: currentPeriodData.conversionRate,
        multiSourceRate: currentPeriodData.multiSourceRate,
        cashCollectedRate: currentPeriodData.cashCollectedRate,
        salesTeam: currentPeriodData.salesTeam,
      }
    };

    // Add previous period data if available
    if (previousPeriodData) {
      response['previousPeriod'] = {
        totalContacts: previousPeriodData.totalContacts,
        totalRevenue: previousPeriodData.totalRevenue,
        totalCashCollected: previousPeriodData.totalCashCollected,
        totalDeals: previousPeriodData.totalDeals,
        totalMeetings: previousPeriodData.totalMeetings,
        totalActivities: previousPeriodData.totalActivities,
        conversionRate: previousPeriodData.conversionRate,
        multiSourceRate: previousPeriodData.multiSourceRate,
        cashCollectedRate: previousPeriodData.cashCollectedRate,
      };
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
}