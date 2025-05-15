import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDateRange, DateRange } from "@/providers/date-context";
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
    closed?: number;
    cashCollected?: number;
    contractedValue?: number;
    calls?: number;
    closingRate?: number;
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
    closedDeals?: {
      current: number;
      previous: number;
      change: number;
    };
    cashCollected?: {
      current: number;
      previous: number;
      change: number;
    };
    revenueGenerated?: {
      current: number;
      previous: number;
      change: number;
    };
    totalCalls?: {
      current: number;
      previous: number;
      change: number;
    };
    call1Taken?: {
      current: number;
      previous: number;
      change: number;
    };
    call2Taken?: {
      current: number;
      previous: number;
      change: number;
    };
    closingRate?: {
      current: number;
      previous: number;
      change: number;
    };
    avgCashCollected?: {
      current: number;
      previous: number;
      change: number;
    };
    solutionCallShowRate?: {
      current: number;
      previous: number;
      change: number;
    };
    earningPerCall2?: {
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
    costPerClosedWon?: number;
    closerSlotUtilization?: number;
    solutionCallCloseRate?: number;
    salesCycle?: number;
    callsToClose?: number;
    profitPerSolutionCall?: number;
  };
  triageMetrics: {
    contactsNeedingAssignment: number;
    dealsNeedingReview: number;
    upcomingMeetings: number;
    pendingActivities: number;
    stuckDeals: number;
    booked?: number;
    sits?: number;
    showRate?: string;
    bookingsPerDay?: number;
    setterShowRate?: string;
    setterCloseRate?: string;
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
  timestamp?: string;
  refreshedAt?: string;
}

/**
 * Constructs a query string with date range parameters
 */
function getDateRangeParams(dateRange: DateRange, additionalParams: Record<string, string> = {}): string {
  const params = new URLSearchParams();
  
  // Always add date range parameters
  params.append('startDate', dateRange.startDate.toISOString());
  params.append('endDate', dateRange.endDate.toISOString());
  
  // Add any additional parameters
  Object.entries(additionalParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, value);
    }
  });
  
  return `?${params.toString()}`;
}

/**
 * Custom hook for fetching dashboard data with the current date range
 * 
 * @param options Optional parameters (date, userId, useEnhanced)
 * @returns Query result with dashboard data
 */
export function useDashboardData(options?: string | { date?: string; userId?: string; useEnhanced?: boolean; skipAttribution?: boolean }) {
  const { dateRange, isLoading: isDateLoading, refreshData } = useDateRange();
  let userId: string | undefined;
  let skipAttribution: boolean | undefined;
  
  // Handle both string and object parameters for backward compatibility
  if (typeof options === 'string') {
    userId = options;
  } else if (options && typeof options === 'object') {
    userId = options.userId;
    skipAttribution = options.skipAttribution;
  }
  
  // Construct additional parameters
  const additionalParams: Record<string, string> = {};
  if (userId) additionalParams.userId = userId;
  if (skipAttribution) additionalParams.skipAttribution = 'true';
  
  return useQuery<DashboardData>({
    queryKey: ['/api/enhanced-dashboard', dateRange.startDate.toISOString(), dateRange.endDate.toISOString(), userId, skipAttribution],
    enabled: !isDateLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    queryFn: async () => {
      console.log(`[DashboardData] Fetching data for date range: ${dateRange.startDate.toDateString()} to ${dateRange.endDate.toDateString()}`);
      
      const apiUrl = `/api/enhanced-dashboard${getDateRangeParams(dateRange, additionalParams)}`;
      console.log(`[DashboardData] API URL: ${apiUrl}`);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        console.error(`[DashboardData] Error response: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to fetch dashboard data: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // If we have a success=false response, still provide fallback structure 
      // to prevent dashboard from crashing
      if (data.success === false || data.partialData === true) {
        console.warn('[DashboardData] Server returned error or partial data:', data.error || 'Unknown error');
        
        // Create a complete fallback structure with all required KPIs
        // This ensures dashboard doesn't crash with undefined properties
        return {
          kpis: {
            deals: { current: 0, previous: 0, change: 0 },
            revenue: { current: 0, previous: 0, change: 0 },
            activities: { current: 0, previous: 0, change: 0 },
            meetings: { current: 0, previous: 0, change: 0 },
            closedDeals: { current: 0, previous: 0, change: 0 },
            cashCollected: { current: 0, previous: 0, change: 0 },
            revenueGenerated: { current: 0, previous: 0, change: 0 },
            totalCalls: { current: 0, previous: 0, change: 0 },
            call1Taken: { current: 0, previous: 0, change: 0 },
            call2Taken: { current: 0, previous: 0, change: 0 },
            closingRate: 0,
            avgCashCollected: 0,
            solutionCallShowRate: 0,
            earningPerCall2: 0
          },
          salesTeam: [],
          leadMetrics: {
            newLeadsToday: 0,
            leadsLastWeek: 0,
            averageLeadQualificationTime: 0,
            leadConversionRate: 0,
            leadSourceDistribution: {},
            totalLeads: 0,
            qualifiedLeads: 0,
            conversionRate: 0,
            costPerLead: 0,
            qualifiedRate: 0,
            responseRate: 0
          },
          timelineData: [],
          topDeals: [],
          refreshedAt: new Date().toISOString(),
          success: false,
          error: data.error || 'Error fetching dashboard data',
          partialData: true
        };
      }
      
      // Add a client-side timestamp to track when the data was loaded
      // Also ensure all KPI fields exist to prevent null reference errors
      return {
        ...data,
        kpis: {
          deals: data.kpis?.deals || { current: 0, previous: 0, change: 0 },
          revenue: data.kpis?.revenue || { current: 0, previous: 0, change: 0 },
          activities: data.kpis?.activities || { current: 0, previous: 0, change: 0 },
          meetings: data.kpis?.meetings || { current: 0, previous: 0, change: 0 },
          closedDeals: data.kpis?.closedDeals || { current: 0, previous: 0, change: 0 },
          cashCollected: data.kpis?.cashCollected || { current: 0, previous: 0, change: 0 },
          revenueGenerated: data.kpis?.revenueGenerated || { current: 0, previous: 0, change: 0 },
          totalCalls: data.kpis?.totalCalls || { current: 0, previous: 0, change: 0 },
          call1Taken: data.kpis?.call1Taken || { current: 0, previous: 0, change: 0 },
          call2Taken: data.kpis?.call2Taken || { current: 0, previous: 0, change: 0 },
          closingRate: data.kpis?.closingRate || 0,
          avgCashCollected: data.kpis?.avgCashCollected || 0, 
          solutionCallShowRate: data.kpis?.solutionCallShowRate || 0,
          earningPerCall2: data.kpis?.earningPerCall2 || 0,
          ...data.kpis
        },
        refreshedAt: new Date().toISOString()
      };
    }
  });
}

/**
 * Custom hook for prefetching dashboard data to improve perceived performance
 * 
 * @param queryClient QueryClient instance to use for prefetching
 */
export function usePrefetchDashboardData() {
  const { dateRange } = useDateRange();
  const queryClient = useQueryClient();
  
  // Prefetch dashboard data for all users
  const prefetchDashboardData = () => {
    queryClient.prefetchQuery({
      queryKey: ['/api/enhanced-dashboard', dateRange.startDate.toISOString(), dateRange.endDate.toISOString(), 'all'],
      staleTime: 5 * 60 * 1000,
      queryFn: async () => {
        const apiUrl = `/api/enhanced-dashboard${getDateRangeParams(dateRange, { userId: 'all' })}`;
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error('Failed to prefetch dashboard data');
        }
        
        return response.json();
      }
    });
  };
  
  return { prefetchDashboardData };
}

/**
 * Interface for attribution stats data
 */
export interface AttributionStatsData {
  success?: boolean;
  attributionAccuracy?: number;
  timedOut?: boolean;
  totalContacts?: number;
  contactsWithMeetings?: number;
  contactsWithDeals?: number;
  totalTouchpoints?: number;
  conversionRate?: number;
  mostEffectiveChannel?: string;
  averageTouchpointsPerContact?: number;
  channelBreakdown?: {
    [channel: string]: number;
  };
  stats?: {
    totalContacts: number;
    contactsWithDeals: number;
    multiSourceContacts: number;
    multiSourceRate: number;
    dealAttributionRate: number;
    fieldCoverage: number;
    highCertaintyContacts?: number;
    channelDistribution: {
      [channel: string]: number;
    }
  }
}

/**
 * Custom hook for fetching attribution stats data with built-in timeout handling and retries
 * 
 * @returns Query result with attribution stats data
 */
export function useAttributionStats() {
  const { dateRange, refreshData } = useDateRange();
  
  return useQuery<AttributionStatsData>({
    queryKey: ['/api/attribution/stats', dateRange.startDate.toISOString(), dateRange.endDate.toISOString()],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2, // Retry up to 2 times
    retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 30000), // Exponential backoff with max of 30 seconds
    queryFn: async () => {
      // Create an abort controller with timeout
      // Extended timeout for large dataset test (1000 deals)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 seconds timeout
      
      try {
        console.log(`[AttributionStats] Fetching data for date range: ${dateRange.startDate.toDateString()} to ${dateRange.endDate.toDateString()}`);
        
        const apiUrl = `/api/attribution/stats${getDateRangeParams(dateRange)}`;
        console.log(`[AttributionStats] API URL: ${apiUrl}`);
        
        const response = await fetch(apiUrl, { signal: controller.signal });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("[AttributionStats] Error response:", errorText);
          throw new Error(`Failed to fetch attribution stats: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("[AttributionStats] Data received:", data ? "Success" : "No data");
        
        // Debug stats structure
        if (data.stats) {
          console.log("Stats Structure:", Object.keys(data.stats));
        }
        
        if (data.attributionAccuracy) {
          console.log("Attribution Accuracy:", data.attributionAccuracy);
        }
        
        // Normalize for consistent structure in components, especially with fallback data
        return {
          ...data,
          channelBreakdown: data.channelBreakdown || (data.stats?.channelDistribution || {}),
          totalTouchpoints: data.totalTouchpoints || 
            (data.stats?.channelDistribution ? 
              Object.values(data.stats.channelDistribution).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0) : 0)
        };
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof DOMException && error.name === "AbortError") {
          console.error("[AttributionStats] Request timed out after 15 seconds");
          throw new Error("Request timed out. The attribution data calculation may be taking longer than expected.");
        }
        console.error("[AttributionStats] Fetch error:", error);
        throw error;
      }
    }
  });
}

/**
 * Function to trigger a data sync for all sources
 * 
 * @returns Promise resolving to the sync result
 */
export async function syncData() {
  console.log("[API] Triggering a manual data sync");
  const result = await apiRequest('/api/sync/all', 'POST');
  return result;
}

/**
 * Function to invalidate dashboard data cache
 * 
 * @returns Promise resolving to cache invalidation result
 */
export async function invalidateDashboardData() {
  console.log("[Cache] Invalidating dashboard data");
  
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