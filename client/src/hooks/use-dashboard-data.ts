import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useDateContext } from '@/providers/date-context';

export interface SalesTeamMember {
  userId: string;
  name: string;
  contactsOwned: number;
  dealsOwned: number;
  meetings: number;
  activities: number;
  revenue: number;
  cashCollected: number;
}

interface PeriodValue {
  current: number;
  previous?: number;
}

interface DashboardData {
  totalContacts: PeriodValue;
  totalRevenue: PeriodValue;
  totalCashCollected: PeriodValue;
  totalDeals: PeriodValue;
  totalMeetings: PeriodValue;
  totalActivities: PeriodValue;
  conversionRate: PeriodValue;
  multiSourceRate: PeriodValue;
  cashCollectedRate: PeriodValue;
  salesTeam: SalesTeamMember[];
}

interface ApiResponse {
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
    salesTeam: SalesTeamMember[];
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
  };
}

/**
 * Hook for fetching dashboard data based on the date range and user filter
 */
export function useDashboardData() {
  const { startDate, endDate, comparePreviousPeriod } = useDateContext();
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);

  // Calculate the previous period for comparison (same duration as selected period)
  const calculatePreviousPeriod = () => {
    if (!comparePreviousPeriod) return null;
    
    const currentRange = endDate.getTime() - startDate.getTime();
    const previousStart = new Date(startDate.getTime() - currentRange);
    const previousEnd = new Date(endDate.getTime() - currentRange);
    
    return {
      start: previousStart.toISOString().split('T')[0],
      end: previousEnd.toISOString().split('T')[0],
    };
  };

  const previousPeriod = calculatePreviousPeriod();

  // Fetch dashboard data from API
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [
      'dashboard',
      startDate.toISOString(),
      endDate.toISOString(),
      selectedUserId,
      comparePreviousPeriod,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });

      if (selectedUserId) {
        params.append('userId', selectedUserId);
      }

      if (previousPeriod) {
        params.append('previousStartDate', previousPeriod.start);
        params.append('previousEndDate', previousPeriod.end);
      }

      const response = await fetch(`/api/dashboard?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      return await response.json() as ApiResponse;
    },
    enabled: true,
  });

  // Process the data to match the expected format for components
  const processedData: Partial<DashboardData> = {
    totalContacts: {
      current: data?.currentPeriod.totalContacts ?? 0,
      previous: data?.previousPeriod?.totalContacts,
    },
    totalRevenue: {
      current: data?.currentPeriod.totalRevenue ?? 0,
      previous: data?.previousPeriod?.totalRevenue,
    },
    totalCashCollected: {
      current: data?.currentPeriod.totalCashCollected ?? 0,
      previous: data?.previousPeriod?.totalCashCollected,
    },
    totalDeals: {
      current: data?.currentPeriod.totalDeals ?? 0,
      previous: data?.previousPeriod?.totalDeals,
    },
    totalMeetings: {
      current: data?.currentPeriod.totalMeetings ?? 0,
      previous: data?.previousPeriod?.totalMeetings,
    },
    totalActivities: {
      current: data?.currentPeriod.totalActivities ?? 0,
      previous: data?.previousPeriod?.totalActivities,
    },
    conversionRate: {
      current: data?.currentPeriod.conversionRate ?? 0,
      previous: data?.previousPeriod?.conversionRate,
    },
    multiSourceRate: {
      current: data?.currentPeriod.multiSourceRate ?? 0,
      previous: data?.previousPeriod?.multiSourceRate,
    },
    cashCollectedRate: {
      current: data?.currentPeriod.cashCollectedRate ?? 0,
      previous: data?.previousPeriod?.cashCollectedRate,
    },
    salesTeam: data?.currentPeriod.salesTeam ?? [],
  };

  // Select a user to filter data
  const selectUser = (userId: string | undefined) => {
    setSelectedUserId(userId);
  };

  return {
    ...processedData,
    isLoading,
    isError,
    error,
    refetch,
    selectedUserId,
    selectUser,
    previousPeriod: comparePreviousPeriod,
  };
}