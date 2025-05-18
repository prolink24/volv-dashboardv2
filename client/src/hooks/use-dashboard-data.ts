import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { DateRange } from '@/providers/date-context';
import { DashboardData } from '@/providers/dashboard-provider';

// Fix type issue with Date serialization for API requests
const serializeDateRange = (dateRange: DateRange) => {
  return {
    from: dateRange.from?.toISOString(),
    to: dateRange.to?.toISOString(),
  };
};

export function useDashboardData(dateRange: DateRange, userId?: string) {
  return useQuery<DashboardData, Error>({
    queryKey: ['dashboard', serializeDateRange(dateRange), userId],
    queryFn: async () => {
      if (!dateRange.from || !dateRange.to) {
        throw new Error('Date range not specified');
      }
      
      try {
        // Prepare query parameters
        const params = new URLSearchParams();
        params.append('startDate', dateRange.from.toISOString());
        params.append('endDate', dateRange.to.toISOString());
        
        if (userId) {
          params.append('userId', userId);
        }
        
        // Add a param to request previous period data for comparisons
        params.append('includePreviousPeriod', 'true');
        
        // Make the API request
        const response = await axios.get(`/api/dashboard?${params.toString()}`);
        
        if (response.status !== 200) {
          throw new Error('Failed to fetch dashboard data');
        }
        
        return response.data;
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        throw error;
      }
    },
    // Only refresh when date range or user ID changes
    enabled: !!dateRange.from && !!dateRange.to,
    // Keep data fresh, but don't refetch too often
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}