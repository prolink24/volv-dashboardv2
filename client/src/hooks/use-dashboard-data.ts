import { useQuery } from "@tanstack/react-query";
import { DashboardData } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

interface UseDashboardDataProps {
  date?: string;
  userId?: string;
  useEnhanced?: boolean;
  cache?: boolean;
}

// Create a safe empty dashboard data structure
// This is only used as a fallback when the API fails
const createEmptyDashboardData = () => {
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
      solutionBookingRate: 0,
      cancelRate: 0,
      outboundTriagesSet: 0,
      totalDirectBookings: 0,
      directBookingRate: 0
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
      totalDials: 0,
      pickUpRate: 0
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
    console.log(`[useDashboardData] Processing date parameter: "${date}"`);
    
    // Convert the date string to a Date object and pass as ISO string
    try {
      // Parse date from our custom format (YYYY-MM-DD | Month Day)
      const dateParts = date.split('|')[0].trim().split('-');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // JavaScript months are 0-indexed
        const day = parseInt(dateParts[2]);
        
        console.log(`[useDashboardData] Parsed date parts: year=${year}, month=${month}, day=${day}`);
        
        const dateObj = new Date(year, month, day);
        if (!isNaN(dateObj.getTime())) {
          // Use the ISO string format for the API
          const isoDate = dateObj.toISOString();
          queryParams.append("date", isoDate);
          console.log(`[useDashboardData] Converted date parameter from "${date}" to ISO: "${isoDate}"`);
        } else {
          console.error(`[useDashboardData] Invalid date created from parts: ${date}`);
          // Fallback to a safe default
          const now = new Date();
          queryParams.append("date", now.toISOString());
        }
      } else {
        console.log(`[useDashboardData] Date format doesn't have 3 parts, using as-is: ${date}`);
        queryParams.append("date", date);
      }
    } catch (error) {
      console.error(`[useDashboardData] Error parsing date "${date}":`, error);
      // Fallback to a safe default
      const now = new Date();
      queryParams.append("date", now.toISOString());
    }
  } else {
    console.log(`[useDashboardData] No date parameter provided, using current date`);
    const now = new Date();
    queryParams.append("date", now.toISOString());
  }
  
  if (userId) {
    console.log(`[useDashboardData] Adding userId parameter: ${userId}`);
    queryParams.append("userId", userId);
  }
  
  if (!cache) {
    console.log(`[useDashboardData] Adding cache=false parameter`);
    queryParams.append("cache", "false");
  }
  
  const queryString = queryParams.toString();
  // Use the enhanced dashboard endpoint if specified
  const endpoint = useEnhanced 
    ? `/api/enhanced-dashboard${queryString ? `?${queryString}` : ""}`
    : `/api/dashboard${queryString ? `?${queryString}` : ""}`;
  
  console.log(`Fetching dashboard data from endpoint: ${endpoint}`);
  
  return useQuery<DashboardData>({
    queryKey: [endpoint],
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes - keep in cache longer
    refetchOnWindowFocus: false, // Don't refetch on focus for better performance
    refetchOnMount: true, // Always refetch when component mounts
    retry: 3, // Retry failed requests three times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    // Add detailed error logging
    onError: (error) => {
      console.error(`Error fetching dashboard data from ${endpoint}:`, error);
    },
    // Transform the response to ensure default values or use fallback in development
    select: (data) => {
      if (!data) {
        console.log("Dashboard data is null or undefined, using default structure");
        // Use empty structure with proper types for all required fields
        return createEmptyDashboardData() as unknown as DashboardData;
      }
      
      console.log(`Dashboard data successfully fetched from ${endpoint}`);
      // Log structure for debugging
      console.log("Dashboard data structure:", {
        hasKpis: !!data.kpis,
        hasSalesTeam: !!data.salesTeam,
        hasTriageMetrics: !!data.triageMetrics,
        hasLeadMetrics: !!data.leadMetrics,
        hasAdvancedMetrics: !!data.advancedMetrics,
        hasMissingAdmins: !!data.missingAdmins,
        hasAttribution: !!data.attribution
      });
      
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
    refetchOnWindowFocus: false, // Changed to avoid extra requests
    refetchOnMount: true,
    retry: 5, // Increased retries
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    onError: (error) => {
      console.error("Error fetching attribution stats:", error);
      console.log("Attribution stats error detected, will retry in 2s");
      // After error logging, we'll retry with a delay via the retry config
    },
    onSuccess: (data) => {
      console.log("Attribution stats fetch succeeded:", {
        hasData: !!data,
        success: data?.success,
        hasStats: !!data?.stats,
        attributionAccuracy: data?.attributionAccuracy
      });
    }
  });
}

export function syncData() {
  console.log('Starting data synchronization...');
  
  // Create a timeout controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
  
  return queryClient.fetchQuery({
    queryKey: ["/api/sync/all"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/sync/all", {
          method: "POST",
          credentials: "include",
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        // Clear timeout since request completed
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.error('Sync failed with status:', response.status);
          throw new Error(`Failed to sync data: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Sync completed successfully:', result);
        return result;
      } catch (error) {
        // Clear timeout in case of error
        clearTimeout(timeoutId);
        
        console.error('Error during data sync:', error);
        
        // Provide more useful error messages
        if (error.name === 'AbortError') {
          throw new Error('Data sync timed out. The server might be busy, please try again later.');
        }
        
        throw error;
      }
    },
  });
}

export function invalidateDashboardData() {
  console.log('Invalidating dashboard data caches...');
  
  try {
    // Use a comprehensive approach to invalidate all related queries
    return Promise.all([
      // Invalidate dashboard endpoints
      queryClient.invalidateQueries({ 
        queryKey: ["/api/dashboard"] 
      }),
      // Invalidate enhanced dashboard endpoints
      queryClient.invalidateQueries({ 
        queryKey: ["/api/enhanced-dashboard"] 
      }),
      // Invalidate attribution stats
      queryClient.invalidateQueries({ 
        queryKey: ["/api/attribution/enhanced-stats"] 
      })
    ]).then(() => {
      console.log('All dashboard caches invalidated successfully');
      return true;
    });
  } catch (error) {
    console.error('Error invalidating dashboard caches:', error);
    throw new Error('Failed to refresh dashboard data. Please try again or reload the page.');
  }
}
