import { useQuery } from "@tanstack/react-query";
import { DashboardData } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

interface UseDashboardDataProps {
  date?: string;
  userId?: string;
  useEnhanced?: boolean;
  cache?: boolean;
}

// Type-safe wrapper around DashboardData with partial implementation
// to keep TypeScript happy but still allow for production usage
interface SafeDashboardData extends Partial<DashboardData> {
  kpis: Record<string, any>;
  salesTeam: any[];
  triageMetrics: Record<string, any>;
  missingAdmins: any[];
  advancedMetrics: Record<string, any>;
  attribution: Record<string, any>;
  leadMetrics?: Record<string, any>;
}

// Type assertion helper to satisfy TypeScript while still providing fallback data
const createSafeDashboardData = (): SafeDashboardData => {
  // This is just a safety measure to ensure the UI doesn't crash
  // The real data will come from the API
  return {
    kpis: {
      closedDeals: 0,
      cashCollected: 0,
      revenueGenerated: 0,
      totalCalls: 0,
      call1Taken: 0,
      call2Taken: 0,
      closingRate: 0,
      avgCashCollected: 0,
      solutionCallShowRate: 0,
      earningPerCall2: 0
    },
    salesTeam: [],
    triageMetrics: {
      booked: 0,
      sits: 0,
      showRate: 0,
      sales: 0,
      outboundTriagesSet: 0,
      totalDirectBookings: 0
    },
    missingAdmins: [],
    advancedMetrics: {
      costPerClosedWon: 0,
      closerSlotUtilization: 0,
      solutionCallCloseRate: 0,
      salesCycle: 0,
      callsToClose: 0,
      profitPerSolutionCall: 0
    },
    attribution: {
      accuracy: 0,
      contactsWithMultipleSources: 0, 
      totalContacts: 0,
      multiSourceRate: 0,
      contactsWithMissingData: 0,
      fieldCoverage: 0,
      channelDistribution: [],
      contactsBySource: [],
      insights: []
    },
    leadMetrics: {
      newLeads: 0,
      disqualified: 0,
      totalLeads: 0
    }
  };
};

export function useDashboardData({ 
  date, 
  userId, 
  useEnhanced = true,
  cache = true 
}: UseDashboardDataProps = {}) {
  const queryParams = new URLSearchParams();
  
  if (date) {
    queryParams.append("date", date);
  }
  
  if (userId) {
    queryParams.append("userId", userId);
  }
  
  if (!cache) {
    queryParams.append("cache", "false");
  }
  
  const queryString = queryParams.toString();
  // Use the enhanced dashboard endpoint if specified
  const endpoint = useEnhanced 
    ? `/api/enhanced-dashboard${queryString ? `?${queryString}` : ""}`
    : `/api/dashboard${queryString ? `?${queryString}` : ""}`;
  
  return useQuery<DashboardData>({
    queryKey: [endpoint],
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes - keep in cache longer
    refetchOnWindowFocus: false, // Don't refetch on focus for better performance
    refetchOnMount: true, // Always refetch when component mounts
    retry: 3, // Retry failed requests three times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    // Transform the response to ensure default values or use fallback in development
    select: (data) => {
      if (!data) {
        console.log("Dashboard data is null or undefined, using default structure");
        // In production we'd never want to show fake data
        if (process.env.NODE_ENV === 'production') {
          return { 
            kpis: {}, 
            salesTeam: [], 
            triageMetrics: {}, 
            missingAdmins: [],
            advancedMetrics: {},
            attribution: {}
          } as DashboardData;
        }
        
        // Return a fallback in development only
        return createFallbackDashboardData();
      }
      
      // Return real data with fallbacks for missing properties
      return {
        ...data,
        kpis: data.kpis || {},
        salesTeam: data.salesTeam || [],
        triageMetrics: data.triageMetrics || {},
        missingAdmins: data.missingAdmins || [],
        advancedMetrics: data.advancedMetrics || {},
        attribution: data.attribution || {}
      };
    }
  });
}

export interface AttributionStatsData {
  success: boolean;
  attributionAccuracy?: number;
  stats?: {
    totalContacts: number;
    contactsAnalyzed: number;
    highCertaintyContacts: number;
    multiSourceContacts: number;
    multiSourceRate: number;
    totalDeals: number;
    dealsWithAttribution: number;
    dealAttributionRate: number;
    fieldMappingSuccess: number;
    fieldCoverage: number;
  };
  error?: string;
}

export function useAttributionStats() {
  return useQuery<AttributionStatsData>({
    queryKey: ['/api/attribution/enhanced-stats'],
    staleTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

export function syncData() {
  return queryClient.fetchQuery({
    queryKey: ["/api/sync/all"],
    queryFn: async () => {
      const response = await fetch("/api/sync/all", {
        method: "POST",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to sync data");
      }
      
      return response.json();
    },
  });
}

export function invalidateDashboardData() {
  return queryClient.invalidateQueries({ 
    queryKey: ["/api/dashboard"] 
  }).then(() => {
    return queryClient.invalidateQueries({ 
      queryKey: ["/api/enhanced-dashboard"] 
    });
  }).then(() => {
    return queryClient.invalidateQueries({ 
      queryKey: ["/api/attribution/enhanced-stats"] 
    });
  });
}
