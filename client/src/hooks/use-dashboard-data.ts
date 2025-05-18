import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/query-client';
import { useDateRange } from '@/providers/date-context';

// Types for dashboard data
export interface DashboardData {
  kpis: {
    deals: { current: number; previous: number; change: number };
    revenue: { current: number; previous: number; change: number };
    activities: { current: number; previous: number; change: number };
    meetings: { current: number; previous: number; change: number };
    closedDeals: { current: number; previous: number; change: number };
    cashCollected: { current: number; previous: number; change: number };
    revenueGenerated: { current: number; previous: number; change: number };
    totalCalls: { current: number; previous: number; change: number };
    call1Taken: { current: number; previous: number; change: number };
    call2Taken: { current: number; previous: number; change: number };
    closingRate: number;
    avgCashCollected: number;
    solutionCallShowRate: number;
    earningPerCall2: number;
  };
  salesTeam: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    deals: number;
    revenue: number;
    activities: number;
  }>;
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
  timelineData: Array<{
    date: string;
    deals: number;
    revenue: number;
    activities: number;
  }>;
  topDeals: Array<{
    id: number;
    title: string;
    value: number;
    status: string;
    stage: string;
    closeDate: string;
    owner: string;
  }>;
  stats: {
    totalContacts: number;
    totalDeals: number;
    totalActivities: number;
    totalMeetings: number;
    contactsWithMultipleSources: number;
    totalContactsWithAttribution: number;
  };
  attributionAccuracy: number;
}

// Types for attribution stats
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
    total: number;
    covered: number;
    coverageRate: number;
  };
  channelDistribution: Record<string, number>;
  touchpointStats: {
    total: number;
    average: number;
    max: number;
  };
  totalTouchpoints: number;
  attributionAccuracy: number;
  stats: {
    multiSourceRate: number;
    fieldCoverage: number;
    dealAttributionRate: number;
  };
  channelBreakdown: Record<string, number>;
}

interface DashboardParams {
  userId?: string;
  useEnhanced?: boolean;
}

// Hook to fetch dashboard data
export function useDashboardData(params: DashboardParams = {}) {
  const { dateRange } = useDateRange();
  
  // Format dates for API
  const startDate = dateRange.startDate.toISOString().split('T')[0];
  const endDate = dateRange.endDate.toISOString().split('T')[0];
  
  // Build query key based on parameters
  const queryKey = [
    '/api/dashboard',
    startDate,
    endDate,
    params.userId || 'all',
    params.useEnhanced ? 'enhanced' : 'standard'
  ];
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      // Construct query string with parameters
      const queryParams = new URLSearchParams({
        startDate,
        endDate,
        ...(params.userId ? { userId: params.userId } : {}),
        ...(params.useEnhanced ? { enhanced: 'true' } : {})
      });
      
      const url = `/api/dashboard?${queryParams.toString()}`;
      const data = await fetch(url).then(res => {
        if (!res.ok) {
          throw new Error(`Error fetching dashboard data: ${res.status}`);
        }
        return res.json();
      });
      
      return data as DashboardData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to fetch attribution stats
export function useAttributionStats() {
  const { dateRange } = useDateRange();
  
  // Format dates for API
  const startDate = dateRange.startDate.toISOString().split('T')[0];
  const endDate = dateRange.endDate.toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['/api/attribution-stats', startDate, endDate],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        startDate,
        endDate
      });
      
      const url = `/api/attribution-stats?${queryParams.toString()}`;
      const data = await fetch(url).then(res => {
        if (!res.ok) {
          throw new Error(`Error fetching attribution stats: ${res.status}`);
        }
        return res.json();
      });
      
      return data as AttributionStats;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Function to trigger data sync
export async function syncData(): Promise<boolean> {
  try {
    const result = await apiRequest<{ success: boolean }>('/api/sync', 'POST');
    return result.success;
  } catch (error) {
    console.error('Error syncing data:', error);
    throw error;
  }
}

// Function to invalidate dashboard data in cache
export async function invalidateDashboardData(): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
  await queryClient.invalidateQueries({ queryKey: ['/api/attribution-stats'] });
}