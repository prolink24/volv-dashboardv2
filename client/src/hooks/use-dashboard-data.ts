import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useDateRange } from "@/providers/date-context";
import { format } from "date-fns";

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
  return `${format(startDate, "yyyy-MM-dd")}_${format(endDate, "yyyy-MM-dd")}`;
};

/**
 * Custom hook to fetch dashboard data
 */
export const useDashboardData = (options: DashboardOptions = {}) => {
  const { dateRange } = useDateRange();
  const dateRangeParam = formatDateRangeParam(dateRange.startDate, dateRange.endDate);
  
  const endpoint = options.useEnhanced 
    ? `/api/dashboard/enhanced?dateRange=${dateRangeParam}${options.userId ? `&userId=${options.userId}` : ''}` 
    : `/api/dashboard?dateRange=${dateRangeParam}${options.userId ? `&userId=${options.userId}` : ''}`;

  return useQuery({
    queryKey: [endpoint],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

/**
 * Custom hook to fetch attribution stats
 */
export const useAttributionStats = () => {
  const { dateRange } = useDateRange();
  const dateRangeParam = formatDateRangeParam(dateRange.startDate, dateRange.endDate);
  
  console.log("[AttributionStats] Fetching data for date range:", dateRange.startDate.toDateString(), "to", dateRange.endDate.toDateString());
  console.log("[AttributionStats] API URL:", `/api/attribution/stats?dateRange=${dateRangeParam}`);

  return useQuery<AttributionStats>({
    queryKey: [`/api/attribution/stats`, dateRangeParam],
    refetchOnWindowFocus: false,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    retryDelay: 1000,
    timeout: 15000, // 15 seconds timeout
    onSuccess: (data) => {
      console.log("[AttributionStats] Successfully fetched data:", data);
    },
    onError: (error) => {
      console.error("[AttributionStats] Request timed out after 15 seconds");
    }
  });
};

/**
 * Function to sync data from all sources
 */
export const syncData = async (): Promise<boolean> => {
  try {
    const response = await apiRequest('/api/sync', { method: 'POST' });
    return response.success === true;
  } catch (error) {
    console.error('Error syncing data:', error);
    throw new Error('Failed to sync data from external sources');
  }
};

/**
 * Function to invalidate dashboard data cache
 */
export const invalidateDashboardData = async (): Promise<void> => {
  const queryClient = useQueryClient();
  await queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
  await queryClient.invalidateQueries({ queryKey: ['/api/dashboard/enhanced'] });
  await queryClient.invalidateQueries({ queryKey: ['/api/attribution/stats'] });
};