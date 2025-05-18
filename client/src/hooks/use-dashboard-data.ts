import { useQuery } from "@tanstack/react-query";
import { useDateContext } from "@/providers/date-context";

// Define the dashboard data structure
export interface DashboardData {
  totalContacts: number;
  totalDeals: number;
  totalActivities: number;
  totalMeetings: number;
  averageDealValue: number;
  averageDealCycle: number;
  contactsWithMultipleSources: number;
  totalContactsWithAttribution: number;
  attributionAccuracy: number;
  salesTeam: SalesTeamMember[];
  revenueGenerated?: number;
  cashCollected?: number;
  previousPeriod?: {
    totalContacts: number;
    totalDeals: number;
    totalRevenue: number;
    cashCollected: number;
  };
}

// Define the sales team member structure
export interface SalesTeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  deals: number;
  revenue: number;
  meetings: number;
  contacts: number;
}

/**
 * Custom hook for fetching dashboard data
 * @param userId Optional user ID to filter data by
 * @returns Query result with dashboard data
 */
export function useDashboardData(userId?: string) {
  const { startDate, endDate, includePreviousPeriod } = useDateContext();
  
  return useQuery({
    queryKey: [
      '/api/dashboard', 
      startDate?.toISOString(), 
      endDate?.toISOString(), 
      userId,
      includePreviousPeriod
    ],
    queryFn: async () => {
      // Verify we have valid dates
      if (!startDate || !endDate) {
        throw new Error('Invalid date range');
      }
      
      // Build query parameters
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        includePreviousPeriod: includePreviousPeriod ? 'true' : 'false'
      });
      
      // Add userId parameter if provided
      if (userId) {
        params.append('userId', userId);
      }
      
      // Fetch data from the API
      const response = await fetch(`/api/dashboard?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      return await response.json() as DashboardData;
    },
    // Only enable the query when we have valid dates
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Custom hook for fetching deals data
 * @param userId Optional user ID to filter data by
 * @returns Query result with deals data
 */
export function useDashboardDeals(userId?: string) {
  const { startDate, endDate } = useDateContext();
  
  return useQuery({
    queryKey: [
      '/api/dashboard/deals', 
      startDate?.toISOString(), 
      endDate?.toISOString(), 
      userId
    ],
    queryFn: async () => {
      // Verify we have valid dates
      if (!startDate || !endDate) {
        throw new Error('Invalid date range');
      }
      
      // Build query parameters
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      // Add userId parameter if provided
      if (userId) {
        params.append('userId', userId);
      }
      
      // Fetch data from the API
      const response = await fetch(`/api/dashboard/deals?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch deals data');
      }
      
      return await response.json();
    },
    // Only enable the query when we have valid dates
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Custom hook for fetching team performance data
 * @returns Query result with team performance data
 */
export function useTeamPerformance() {
  const { startDate, endDate } = useDateContext();
  
  return useQuery({
    queryKey: [
      '/api/dashboard/team', 
      startDate?.toISOString(), 
      endDate?.toISOString()
    ],
    queryFn: async () => {
      // Verify we have valid dates
      if (!startDate || !endDate) {
        throw new Error('Invalid date range');
      }
      
      // Build query parameters
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      // Fetch data from the API
      const response = await fetch(`/api/dashboard/team?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch team performance data');
      }
      
      return await response.json();
    },
    // Only enable the query when we have valid dates
    enabled: !!startDate && !!endDate,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}