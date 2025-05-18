import { useQuery } from '@tanstack/react-query';
import { useDateContext } from '@/providers/date-context';

// Types for dashboard data
export interface DashboardData {
  totalContacts: number;
  totalDeals: number;
  totalActivities: number;
  totalMeetings: number;
  revenueGenerated: number;
  cashCollected: number;
  multiSourceRate: number;
  fieldCoverageRate: number;
  salesTeam: SalesTeamMember[];
  previousPeriod?: {
    totalContacts: number;
    totalDeals: number;
    totalActivities: number;
    totalMeetings: number;
    totalRevenue: number;
    cashCollected: number;
  };
}

export interface SalesTeamMember {
  userId: string;
  name: string;
  contactsOwned: number;
  dealsOwned: number;
  meetings: number;
  activities: number;
  revenue: number;
  cashCollected: number;
}

export interface AttributionStats {
  contactStats: {
    totalContacts: number;
    contactsWithDeals: number;
    contactsWithMeetings: number;
    contactsWithForms: number;
    conversionRate: number;
  };
  sourceDistribution: {
    singleSource: number;
    multiSource: number;
    multiSourceRate: number;
  };
  fieldCoverage: {
    name: number;
    email: number;
    phone: number;
    title: number;
    company: number;
    source: number;
    notes: number;
    assignedTo: number;
    lastActivityDate: number;
    averageCoverage: number;
  };
  channelDistribution: Record<string, number>;
  touchpointStats: {
    averageTouchpoints: number;
    maxTouchpoints: number;
    touchpointDistribution: Record<string, number>;
  };
}

/**
 * Hook to fetch dashboard data based on date range and user filter
 */
export function useDashboardData(userId?: string) {
  const { startDate, endDate, comparePreviousPeriod } = useDateContext();
  
  // Format dates for API
  const formattedStartDate = startDate.toISOString();
  const formattedEndDate = endDate.toISOString();
  
  // Build query parameters
  const queryParams = new URLSearchParams();
  queryParams.append('startDate', formattedStartDate);
  queryParams.append('endDate', formattedEndDate);
  
  if (userId) {
    queryParams.append('userId', userId);
  }
  
  if (comparePreviousPeriod) {
    queryParams.append('comparePreviousPeriod', 'true');
  }
  
  // Construct the API URL
  const apiUrl = `/api/dashboard?${queryParams.toString()}`;
  
  // Fetch dashboard data
  return useQuery<DashboardData>({
    queryKey: ['dashboard', formattedStartDate, formattedEndDate, userId, comparePreviousPeriod],
    queryFn: async () => {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch attribution statistics
 */
export function useAttributionStats() {
  const { startDate, endDate } = useDateContext();
  
  // Format dates for API
  const formattedStartDate = startDate.toISOString();
  const formattedEndDate = endDate.toISOString();
  
  // Build query parameters
  const queryParams = new URLSearchParams();
  queryParams.append('startDate', formattedStartDate);
  queryParams.append('endDate', formattedEndDate);
  
  // Construct the API URL
  const apiUrl = `/api/attribution-stats?${queryParams.toString()}`;
  
  // Fetch attribution stats
  return useQuery<AttributionStats>({
    queryKey: ['attribution-stats', formattedStartDate, formattedEndDate],
    queryFn: async () => {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch attribution stats');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch sales team performance data
 */
export function useSalesTeamData() {
  const { startDate, endDate } = useDateContext();
  
  // Format dates for API
  const formattedStartDate = startDate.toISOString();
  const formattedEndDate = endDate.toISOString();
  
  // Build query parameters
  const queryParams = new URLSearchParams();
  queryParams.append('startDate', formattedStartDate);
  queryParams.append('endDate', formattedEndDate);
  
  // Construct the API URL
  const apiUrl = `/api/dashboard/sales-team?${queryParams.toString()}`;
  
  // Fetch sales team data
  return useQuery<{ salesTeam: SalesTeamMember[] }>({
    queryKey: ['sales-team', formattedStartDate, formattedEndDate],
    queryFn: async () => {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch sales team data');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}