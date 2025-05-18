import { useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/query-client';
import { useDateRange } from '@/providers/date-context';

// Dashboard data interface
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

// Attribution stats interface
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

// Parameters for dashboard data
interface DashboardParams {
  userId?: string;
  useEnhanced?: boolean;
}

// Hook for fetching dashboard data
export function useDashboardData(params: DashboardParams = {}) {
  const { dateRange } = useDateRange();
  
  return useQuery({
    queryKey: ['dashboard', dateRange.startDate.toISOString(), dateRange.endDate.toISOString(), params.userId, params.useEnhanced],
    queryFn: async () => {
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('from', dateRange.startDate.toISOString());
      queryParams.append('to', dateRange.endDate.toISOString());
      
      if (params.userId) {
        queryParams.append('userId', params.userId);
      }
      
      if (params.useEnhanced !== undefined) {
        queryParams.append('enhanced', params.useEnhanced.toString());
      }
      
      return apiRequest<DashboardData>({
        url: `/api/dashboard?${queryParams.toString()}`,
      });
    },
  });
}

// Hook for fetching attribution stats
export function useAttributionStats() {
  const { dateRange } = useDateRange();
  
  return useQuery({
    queryKey: ['attribution-stats', dateRange.startDate.toISOString(), dateRange.endDate.toISOString()],
    queryFn: async () => {
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('from', dateRange.startDate.toISOString());
      queryParams.append('to', dateRange.endDate.toISOString());
      
      return apiRequest<AttributionStats>({
        url: `/api/attribution-stats?${queryParams.toString()}`,
      });
    },
  });
}

// Function to trigger a sync operation
export async function syncData(): Promise<boolean> {
  try {
    await apiRequest<{ success: boolean }>({
      url: '/api/sync',
      method: 'POST',
    });
    
    // Invalidate all dashboard queries to refresh the data
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    await queryClient.invalidateQueries({ queryKey: ['attribution-stats'] });
    
    return true;
  } catch (error) {
    console.error('Error syncing data:', error);
    return false;
  }
}

// Function to invalidate dashboard data
export async function invalidateDashboardData(): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  await queryClient.invalidateQueries({ queryKey: ['attribution-stats'] });
}