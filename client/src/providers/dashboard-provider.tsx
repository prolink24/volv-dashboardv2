import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDateContext } from './date-context';
import { format } from 'date-fns';

export interface SalesTeamMember {
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
}

export interface CurrentPeriodData {
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
}

export interface PreviousPeriodData extends CurrentPeriodData {}

export interface DashboardContextType {
  currentPeriod: CurrentPeriodData;
  previousPeriod: PreviousPeriodData | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  selectedUserId: string | null;
  setSelectedUserId: (id: string | null) => void;
  refresh: () => void;
}

// Default values
const defaultCurrentPeriod: CurrentPeriodData = {
  totalContacts: 0,
  totalRevenue: 0,
  totalCashCollected: 0,
  totalDeals: 0,
  totalMeetings: 0,
  totalActivities: 0,
  conversionRate: 0,
  multiSourceRate: 0,
  cashCollectedRate: 0,
  salesTeam: [],
};

// Create the context
const DashboardContext = createContext<DashboardContextType>({
  currentPeriod: defaultCurrentPeriod,
  previousPeriod: null,
  isLoading: false,
  isError: false,
  error: null,
  selectedUserId: null,
  setSelectedUserId: () => {},
  refresh: () => {},
});

// Custom hook to use the dashboard context
export const useDashboard = () => useContext(DashboardContext);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { currentRange, previousRange } = useDateContext();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Format the dates for the API
  const formatDateParam = (date: Date): string => format(date, 'yyyy-MM-dd');
  
  // Create query parameters
  const getQueryParams = () => {
    const params = new URLSearchParams({
      startDate: formatDateParam(currentRange.startDate),
      endDate: formatDateParam(currentRange.endDate),
    });
    
    if (selectedUserId) {
      params.append('userId', selectedUserId);
    }
    
    if (previousRange) {
      params.append('compareStartDate', formatDateParam(previousRange.startDate));
      params.append('compareEndDate', formatDateParam(previousRange.endDate));
    }
    
    return params.toString();
  };
  
  // Fetch dashboard data
  const {
    data,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/dashboard', currentRange, previousRange, selectedUserId],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard?${getQueryParams()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      return response.json();
    },
    refetchOnWindowFocus: false,
  });
  
  // Extract the data
  const currentPeriod = data?.currentPeriod || defaultCurrentPeriod;
  const previousPeriod = data?.previousPeriod || null;
  
  // Provide the context values
  const contextValue: DashboardContextType = {
    currentPeriod,
    previousPeriod,
    isLoading,
    isError,
    error,
    selectedUserId,
    setSelectedUserId,
    refresh: refetch,
  };
  
  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
}