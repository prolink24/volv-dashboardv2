import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/query-client";

export interface DashboardOptions {
  userId?: string;
  useEnhanced?: boolean;
}

export interface DashboardStats {
  totalContacts: number;
  totalDeals: number;
  totalActivities: number;
  totalMeetings: number;
  contactsWithMultipleSources: number;
  totalContactsWithAttribution: number;
}

export interface DashboardKPIs {
  deals: { current: number; previous: number; change: number };
  revenue: { current: number; previous: number; change: number };
  activities: { current: number; previous: number; change: number };
  meetings: { current: number; previous: number; change: number };
  closedDeals?: { current: number; previous: number; change: number };
  cashCollected?: { current: number; previous: number; change: number };
  revenueGenerated?: { current: number; previous: number; change: number };
  totalCalls?: { current: number; previous: number; change: number } | number;
  call1Taken?: { current: number; previous: number; change: number } | number;
  call2Taken?: { current: number; previous: number; change: number } | number;
  closingRate?: number;
  avgCashCollected?: number;
  solutionCallShowRate?: number;
  earningPerCall2?: number;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  salesTeam: any[];
  leadMetrics: {
    newLeadsToday: number;
    leadsLastWeek: number;
    averageLeadQualificationTime: number;
    leadConversionRate: number;
    leadSourceDistribution: Record<string, number>;
    totalLeads: number;
    qualifiedLeads: number;
    conversionRate: number;
    costPerLead: number;
    qualifiedRate: number;
    responseRate: number;
  };
  timelineData: any[];
  topDeals: any[];
  stats: DashboardStats;
  attributionAccuracy: number;
  refreshedAt?: string;
}

export interface AttributionStats {
  stats: {
    multiSourceRate: number;
    fieldCoverage: number;
    dealAttributionRate: number;
  },
  attributionAccuracy: number;
  channelBreakdown: Record<string, number>;
  totalTouchpoints?: number;
}

/**
 * Format date range for API requests
 */
export const formatDateRangeParam = (startDate: Date, endDate: Date): string => {
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  };
  
  return `${formatDate(startDate)},${formatDate(endDate)}`;
};

/**
 * Custom hook to fetch dashboard data
 */
export const useDashboardData = (options: DashboardOptions = {}) => {
  const { userId, useEnhanced = true } = options;
  
  return useQuery({
    queryKey: ['/api/dashboard', userId, useEnhanced],
    queryFn: async () => {
      const endpoint = '/api/dashboard';
      const params: Record<string, any> = {};
      
      if (userId) {
        params.userId = userId;
      }
      
      if (useEnhanced) {
        params.enhanced = "true";
      }
      
      return await apiRequest(endpoint, { params });
    },
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Custom hook to fetch attribution stats
 */
export const useAttributionStats = () => {
  return useQuery({
    queryKey: ['/api/attribution-stats'],
    queryFn: async () => {
      return await apiRequest('/api/attribution-stats');
    },
    refetchOnWindowFocus: false,
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Function to sync data from all sources
 */
export const syncData = async (): Promise<boolean> => {
  try {
    const result = await apiRequest('/api/sync', {
      method: 'POST',
    });
    
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['/api/attribution-stats'] });
    
    return result.success || false;
  } catch (error) {
    console.error('Error syncing data:', error);
    return false;
  }
};

/**
 * Function to invalidate dashboard data cache
 */
export const invalidateDashboardData = async (): Promise<void> => {
  try {
    await apiRequest('/api/dashboard/invalidate', {
      method: 'POST',
    });
    
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
  } catch (error) {
    console.error('Error invalidating dashboard cache:', error);
    throw error;
  }
};