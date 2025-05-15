import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDateRange } from "@/providers/date-context";
import { apiRequest } from "@/lib/queryClient";

/**
 * Dashboard data interface representing data returned from the API
 */
export interface DashboardData {
  salesTeam: Array<{
    id: string;
    name: string;
    role: string;
    deals: number;
    meetings: number;
    activities: number;
    performance: number;
  }>;
  stats: {
    totalContacts: number;
    totalDeals: number;
    totalActivities: number;
    totalMeetings: number;
    averageDealValue: number;
    averageDealCycle: number;
    contactsWithMultipleSources: number;
    totalContactsWithAttribution: number;
  };
  attributionAccuracy: number;
  kpis: {
    meetings: {
      current: number;
      previous: number;
      change: number;
    };
    contacts: {
      current: number;
      previous: number;
      change: number;
    };
    deals: {
      current: number;
      previous: number;
      change: number;
    };
    revenue: {
      current: number;
      previous: number;
      change: number;
    };
    activities: {
      current: number;
      previous: number;
      change: number;
    };
    performance: {
      current: number;
      previous: number;
      change: number;
    };
  };
  advancedMetrics: {
    timeToFirstMeeting: number;
    timeToFirstActivity: number;
    timeToFirstDeal: number;
    averageContactsPerDeal: number;
    averageMeetingsPerDeal: number;
    averageActivitiesPerDeal: number;
    conversionRate: number;
  };
  triageMetrics: {
    contactsNeedingAssignment: number;
    dealsNeedingReview: number;
    upcomingMeetings: number;
    pendingActivities: number;
    stuckDeals: number;
  };
  leadMetrics: {
    newLeadsToday: number;
    leadsLastWeek: number;
    averageLeadQualificationTime: number;
    leadConversionRate: number;
    leadSourceDistribution: {
      [source: string]: number;
    };
  };
  missingAdmins: number;
}

/**
 * Custom hook for fetching dashboard data with the current date range
 * 
 * @param options Optional parameters (date, userId, useEnhanced)
 * @returns Query result with dashboard data
 */
export function useDashboardData(options?: string | { date?: string; userId?: string; useEnhanced?: boolean }) {
  const { dateRange, isLoading: isDateLoading } = useDateRange();
  let userId: string | undefined;
  
  // Handle both string and object parameters for backward compatibility
  if (typeof options === 'string') {
    userId = options;
  } else if (options && typeof options === 'object') {
    userId = options.userId;
    // We could use the date parameter here if needed, but we'll prioritize the global date context
  }
  
  return useQuery<DashboardData>({
    queryKey: ['/api/enhanced-dashboard', dateRange.startDate.toISOString(), dateRange.endDate.toISOString(), userId],
    enabled: !isDateLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    // Add specific query parameters for date range
    queryFn: async () => {
      const response = await fetch(`/api/enhanced-dashboard?startDate=${encodeURIComponent(dateRange.startDate.toISOString())}&endDate=${encodeURIComponent(dateRange.endDate.toISOString())}${userId ? `&userId=${encodeURIComponent(userId)}` : ''}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      return response.json();
    }
  });
}

/**
 * Custom hook for prefetching dashboard data to improve perceived performance
 * 
 * @param queryClient QueryClient instance to use for prefetching
 */
export function usePrefetchDashboardData(queryClient: any) {
  const { dateRange } = useDateRange();
  
  // Prefetch dashboard data for all users
  queryClient.prefetchQuery({
    queryKey: ['/api/enhanced-dashboard', dateRange.startDate.toISOString(), dateRange.endDate.toISOString(), 'all'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await fetch(`/api/enhanced-dashboard?startDate=${encodeURIComponent(dateRange.startDate.toISOString())}&endDate=${encodeURIComponent(dateRange.endDate.toISOString())}&userId=all`);
      if (!response.ok) {
        throw new Error('Failed to prefetch dashboard data');
      }
      return response.json();
    }
  });
  
  // You could add additional prefetching for specific users or other common queries
}

/**
 * Interface for attribution stats data
 */
export interface AttributionStatsData {
  success: boolean;
  attributionAccuracy: number;
  stats: {
    totalContacts: number;
    contactsWithDeals: number;
    multiSourceContacts: number;
    multiSourceRate: number;
    dealAttributionRate: number;
    fieldCoverage: number;
    channelDistribution: {
      [channel: string]: number;
    }
  }
}

/**
 * Custom hook for fetching attribution stats data
 * 
 * @returns Query result with attribution stats data
 */
export function useAttributionStats() {
  const { dateRange } = useDateRange();
  
  return useQuery<AttributionStatsData>({
    queryKey: ['/api/attribution/stats', dateRange.startDate.toISOString(), dateRange.endDate.toISOString()],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await fetch(`/api/attribution/stats?startDate=${encodeURIComponent(dateRange.startDate.toISOString())}&endDate=${encodeURIComponent(dateRange.endDate.toISOString())}`);
      if (!response.ok) {
        throw new Error('Failed to fetch attribution stats');
      }
      return response.json();
    }
  });
}

/**
 * Function to trigger a data sync for all sources
 * 
 * @returns Promise resolving to the sync result
 */
export async function syncData() {
  const result = await apiRequest('/api/sync/all', 'POST');
  return result;
}

/**
 * Function to invalidate dashboard data cache
 * 
 * @returns Promise resolving to cache invalidation result
 */
export async function invalidateDashboardData() {
  // Import queryClient directly from lib
  const queryClient = require('@/lib/queryClient').queryClient;
  if (!queryClient) {
    throw new Error('Query client not available');
  }
  
  // Invalidate all dashboard-related queries
  queryClient.invalidateQueries({ predicate: query => {
    const queryKey = Array.isArray(query.queryKey) ? query.queryKey[0] : query.queryKey;
    return typeof queryKey === 'string' && 
      (queryKey.includes('/dashboard') || 
       queryKey.includes('/enhanced-dashboard') || 
       queryKey.includes('/attribution'));
  }});
  
  // Also trigger a cache clear via API
  const result = await apiRequest('/api/cache/clear', 'POST', { prefix: 'dashboard' });
  return result;
}