import { useQuery } from "@tanstack/react-query";
import { DashboardData } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

interface UseDashboardDataProps {
  date?: string;
  userId?: string;
}

export function useDashboardData({ date, userId }: UseDashboardDataProps = {}) {
  const queryParams = new URLSearchParams();
  
  if (date) {
    queryParams.append("date", date);
  }
  
  if (userId) {
    queryParams.append("userId", userId);
  }
  
  const queryString = queryParams.toString();
  const endpoint = `/api/dashboard${queryString ? `?${queryString}` : ""}`;
  
  return useQuery<DashboardData>({
    queryKey: [endpoint],
    staleTime: 1000 * 60 * 5, // 5 minutes
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
  return queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
}
