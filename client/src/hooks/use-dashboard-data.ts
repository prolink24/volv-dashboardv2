import { useQuery } from '@tanstack/react-query';
import { useDateContext } from '@/providers/date-context';

// Sales team member type
export interface SalesTeamMember {
  id: string;
  name: string;
  totalContacts: number;
  totalDeals: number;
  totalRevenue: number;
  totalCashCollected: number;
  totalMeetings: number;
  totalActivities: number;
  conversionRate: number;
}

// Dashboard metric with current and previous period values
interface DashboardMetric {
  current: number;
  previous?: number;
  change?: number;
}

// Dashboard data structure
export interface DashboardData {
  totalContacts: DashboardMetric;
  totalRevenue: DashboardMetric;
  totalCashCollected: DashboardMetric;
  totalDeals: DashboardMetric;
  totalMeetings: DashboardMetric;
  totalActivities: DashboardMetric;
  conversionRate: DashboardMetric;
  multiSourceRate: DashboardMetric;
  cashCollectedRate: DashboardMetric;
}

/**
 * Custom hook to fetch and format dashboard data
 */
export function useDashboardData(userId?: string) {
  const { 
    startDate, 
    endDate, 
    comparePreviousPeriod,
    previousStartDate,
    previousEndDate
  } = useDateContext();

  // Format dates for API
  const startDateStr = startDate.toISOString();
  const endDateStr = endDate.toISOString();
  
  // Build query parameters
  let queryParams = `startDate=${startDateStr}&endDate=${endDateStr}`;
  
  // Add user ID filter if provided
  if (userId) {
    queryParams += `&userId=${userId}`;
  }
  
  // Add previous period dates if comparing
  if (comparePreviousPeriod && previousStartDate && previousEndDate) {
    queryParams += `&previousStartDate=${previousStartDate.toISOString()}&previousEndDate=${previousEndDate.toISOString()}`;
  }
  
  // Fetch dashboard data from API
  const {
    data: apiData,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/dashboard', startDateStr, endDateStr, userId, comparePreviousPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      return response.json();
    },
    enabled: true
  });
  
  // Extract and format dashboard data
  const dashboardData: DashboardData | undefined = apiData ? {
    totalContacts: {
      current: apiData.currentPeriod.totalContacts || 0,
      previous: comparePreviousPeriod ? apiData.previousPeriod?.totalContacts || 0 : undefined,
      change: comparePreviousPeriod && apiData.previousPeriod?.totalContacts
        ? calculatePercentChange(apiData.currentPeriod.totalContacts, apiData.previousPeriod.totalContacts)
        : undefined
    },
    totalRevenue: {
      current: apiData.currentPeriod.totalRevenue || 0,
      previous: comparePreviousPeriod ? apiData.previousPeriod?.totalRevenue || 0 : undefined,
      change: comparePreviousPeriod && apiData.previousPeriod?.totalRevenue 
        ? calculatePercentChange(apiData.currentPeriod.totalRevenue, apiData.previousPeriod.totalRevenue)
        : undefined
    },
    totalCashCollected: {
      current: apiData.currentPeriod.totalCashCollected || 0,
      previous: comparePreviousPeriod ? apiData.previousPeriod?.totalCashCollected || 0 : undefined,
      change: comparePreviousPeriod && apiData.previousPeriod?.totalCashCollected
        ? calculatePercentChange(apiData.currentPeriod.totalCashCollected, apiData.previousPeriod.totalCashCollected)
        : undefined
    },
    totalDeals: {
      current: apiData.currentPeriod.totalDeals || 0,
      previous: comparePreviousPeriod ? apiData.previousPeriod?.totalDeals || 0 : undefined,
      change: comparePreviousPeriod && apiData.previousPeriod?.totalDeals
        ? calculatePercentChange(apiData.currentPeriod.totalDeals, apiData.previousPeriod.totalDeals)
        : undefined
    },
    totalMeetings: {
      current: apiData.currentPeriod.totalMeetings || 0,
      previous: comparePreviousPeriod ? apiData.previousPeriod?.totalMeetings || 0 : undefined,
      change: comparePreviousPeriod && apiData.previousPeriod?.totalMeetings
        ? calculatePercentChange(apiData.currentPeriod.totalMeetings, apiData.previousPeriod.totalMeetings)
        : undefined
    },
    totalActivities: {
      current: apiData.currentPeriod.totalActivities || 0,
      previous: comparePreviousPeriod ? apiData.previousPeriod?.totalActivities || 0 : undefined,
      change: comparePreviousPeriod && apiData.previousPeriod?.totalActivities
        ? calculatePercentChange(apiData.currentPeriod.totalActivities, apiData.previousPeriod.totalActivities)
        : undefined
    },
    conversionRate: {
      current: apiData.currentPeriod.conversionRate || 0,
      previous: comparePreviousPeriod ? apiData.previousPeriod?.conversionRate || 0 : undefined,
      change: comparePreviousPeriod && apiData.previousPeriod?.conversionRate
        ? calculatePercentChange(apiData.currentPeriod.conversionRate, apiData.previousPeriod.conversionRate)
        : undefined
    },
    multiSourceRate: {
      current: apiData.currentPeriod.multiSourceRate || 0,
      previous: comparePreviousPeriod ? apiData.previousPeriod?.multiSourceRate || 0 : undefined,
      change: comparePreviousPeriod && apiData.previousPeriod?.multiSourceRate
        ? calculatePercentChange(apiData.currentPeriod.multiSourceRate, apiData.previousPeriod.multiSourceRate)
        : undefined
    },
    cashCollectedRate: {
      current: apiData.currentPeriod.cashCollectedRate || 0,
      previous: comparePreviousPeriod ? apiData.previousPeriod?.cashCollectedRate || 0 : undefined,
      change: comparePreviousPeriod && apiData.previousPeriod?.cashCollectedRate
        ? calculatePercentChange(apiData.currentPeriod.cashCollectedRate, apiData.previousPeriod.cashCollectedRate)
        : undefined
    }
  } : undefined;
  
  // Extract sales team data
  const salesTeam: SalesTeamMember[] | undefined = apiData?.currentPeriod.salesTeam || [];
  
  return {
    dashboardData,
    salesTeam,
    isLoading,
    isError,
    error,
    refetch
  };
}

/**
 * Calculate percent change between two values
 */
function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}