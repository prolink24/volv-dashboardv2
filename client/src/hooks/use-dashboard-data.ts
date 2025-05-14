import { useQuery } from "@tanstack/react-query";
import { DashboardData } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

interface UseDashboardDataProps {
  date?: string;
  userId?: string;
  useEnhanced?: boolean;
  cache?: boolean;
}

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
    refetchOnWindowFocus: true,
    refetchOnMount: true,
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
