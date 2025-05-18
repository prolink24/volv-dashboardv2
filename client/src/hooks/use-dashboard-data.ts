import { useQuery } from '@tanstack/react-query';
import { useDashboard } from '@/providers/dashboard-provider';
import { useDateContext } from '@/providers/date-context';
import axios from 'axios';

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