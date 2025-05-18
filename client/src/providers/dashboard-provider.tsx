import React, { createContext, useContext, useState, useEffect } from 'react';
import { useDateContext } from './date-context';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

// Dashboard data interface
export interface DashboardData {
  totalContacts: number;
  totalDeals: number;
  totalActivities: number;
  totalMeetings: number;
  revenueGenerated: number;
  cashCollected: number;
  averageDealValue: number;
  averageDealCycle: number;
  attributionAccuracy: number;
  contactsWithMultipleSources: number;
  totalContactsWithAttribution: number;
  salesTeam: {
    id: number | string;
    name: string;
    role: string;
    deals: number;
    revenue: number;
    meetings: number;
    contacts: number;
  }[];
  previousPeriod?: {
    totalContacts: number;
    totalDeals: number;
    totalActivities: number;
    totalMeetings: number;
    totalRevenue: number;
    cashCollected: number;
  };
}

// Dashboard context interface
interface DashboardContextType {
  data: DashboardData | null;
  isLoading: boolean;
  error: Error | null;
  selectedUserId: string | null;
  setSelectedUserId: (userId: string | null) => void;
  refreshData: () => void;
}

// Create the context with default values
const DashboardContext = createContext<DashboardContextType>({
  data: null,
  isLoading: false,
  error: null,
  selectedUserId: null,
  setSelectedUserId: () => {},
  refreshData: () => {},
});

// Hook to use the dashboard context
export const useDashboard = () => useContext(DashboardContext);

// Provider component
export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { startDate, endDate, includePreviousPeriod } = useDateContext();
  
  // Format dates for the API calls
  const formatDate = (date: Date | null): string | null => {
    if (!date) return null;
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };
  
  // Build query parameters for the API call
  const getQueryParams = () => {
    const params = new URLSearchParams();
    
    if (startDate) params.append('startDate', formatDate(startDate) || '');
    if (endDate) params.append('endDate', formatDate(endDate) || '');
    if (includePreviousPeriod) params.append('comparePreviousPeriod', 'true');
    if (selectedUserId) params.append('userId', selectedUserId);
    
    return params.toString();
  };
  
  // Create query key that depends on all filter parameters
  const queryKey = [
    '/api/dashboard',
    formatDate(startDate),
    formatDate(endDate),
    includePreviousPeriod,
    selectedUserId
  ];
  
  // Fetch dashboard data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = getQueryParams();
      const url = `/api/dashboard${params ? `?${params}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error fetching dashboard data: ${response.statusText}`);
      }
      
      return response.json() as Promise<DashboardData>;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
  
  // Function to manually refresh data
  const refreshData = () => {
    // Clear cache for this query
    queryClient.invalidateQueries({ queryKey });
    refetch();
  };
  
  return (
    <DashboardContext.Provider
      value={{
        data: data || null,
        isLoading,
        error: error as Error | null,
        selectedUserId,
        setSelectedUserId,
        refreshData,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}