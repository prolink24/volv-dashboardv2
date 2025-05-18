import { useQuery } from '@tanstack/react-query';
import { useDashboard } from '@/providers/dashboard-provider';
import { useDateContext } from '@/providers/date-context';
import axios from 'axios';
import { queryClient } from '@/lib/queryClient';

interface DashboardResponse {
  currentPeriod: {
    totalContacts: number;
    totalRevenue: number;
    totalCashCollected: number;
    totalDeals: number;
    totalMeetings: number;
    totalActivities: number;
    conversionRate: number;
    multiSourceRate: number;
    cashCollectedRate: number;
    salesTeam: Array<{
      id: string;
      name: string;
      role: string;
      deals: number;
      meetings: number;
      activities: number;
      performance: number;
      closed: number;
      cashCollected: number;
      revenue: number;
      contractedValue: number;
      calls: number;
      closingRate: number;
    }>;
  };
  previousPeriod?: {
    totalContacts: number;
    totalRevenue: number;
    totalCashCollected: number;
    totalDeals: number;
    totalMeetings: number;
    totalActivities: number;
    conversionRate: number;
    multiSourceRate: number;
    cashCollectedRate: number;
    salesTeam: Array<any>;
  };
}

export function useDashboardData() {
  const { setCurrentPeriod, setPreviousPeriod, selectedUserId, setIsLoading, setError } = useDashboard() as any;
  const { currentRange, previousRange } = useDateContext();

  return useQuery({
    queryKey: [
      '/api/dashboard', 
      currentRange.startDate.toISOString(), 
      currentRange.endDate.toISOString(), 
      selectedUserId,
      previousRange?.startDate?.toISOString(),
      previousRange?.endDate?.toISOString()
    ],
    queryFn: async () => {
      const params: Record<string, string> = {
        startDate: currentRange.startDate.toISOString(),
        endDate: currentRange.endDate.toISOString(),
      };

      if (selectedUserId) {
        params.userId = selectedUserId;
      }

      if (previousRange) {
        params.previousStartDate = previousRange.startDate.toISOString();
        params.previousEndDate = previousRange.endDate.toISOString();
      }

      const response = await axios.get<DashboardResponse>('/api/dashboard', { params });
      return response.data;
    },
    onSuccess: (data) => {
      setCurrentPeriod(data.currentPeriod);
      if (data.previousPeriod) {
        setPreviousPeriod(data.previousPeriod);
      } else {
        setPreviousPeriod(null);
      }
      setError(null);
    },
    onError: (error: Error) => {
      console.error('Error fetching dashboard data:', error);
      setError(`Failed to load dashboard data: ${error.message}`);
    },
    onSettled: () => {
      setIsLoading(false);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for getting attribution statistics
 * Used by the attribution stats component to display data quality metrics
 */
export function useAttributionStats() {
  const { currentRange } = useDateContext();
  const { selectedUserId } = useDashboard() as any;
  
  return useQuery({
    queryKey: [
      '/api/attribution-stats',
      currentRange.startDate.toISOString(),
      currentRange.endDate.toISOString(),
      selectedUserId
    ],
    queryFn: async () => {
      try {
        const params: Record<string, string> = {
          startDate: currentRange.startDate.toISOString(),
          endDate: currentRange.endDate.toISOString(),
        };
  
        if (selectedUserId) {
          params.userId = selectedUserId;
        }
  
        // Fetch attribution stats from API
        const response = await axios.get('/api/attribution-stats', { params });
        return response.data;
      } catch (error) {
        console.error('Error fetching attribution stats:', error);
        // Return a simplified fallback with error state for UI to handle
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to fetch attribution stats',
          attributionAccuracy: 0,
          stats: null
        };
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1, // Only retry once to avoid excessive requests if the API is down
  });
}

// Utility function to invalidate dashboard data and force refresh
export function invalidateDashboardData() {
  queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
}

// Utility function to trigger a data sync and reload dashboard
export async function syncData() {
  try {
    await axios.post('/api/sync');
    // Invalidate all dashboard-related queries
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['/api/attribution-stats'] });
    return { success: true };
  } catch (error) {
    console.error('Error syncing data:', error);
    return { 
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync data'
    };
  }
}