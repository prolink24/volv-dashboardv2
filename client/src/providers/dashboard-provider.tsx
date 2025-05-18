import React, { createContext, useContext, ReactNode, useState } from 'react';
import { useDateContext } from './date-context';
import { useDashboardData } from '@/hooks/use-dashboard-data';

// Define the shape of our dashboard data
export interface DashboardData {
  // Contact-related metrics
  totalContacts: number;
  contactsWithDeals: number;
  multiSourceRate: number;
  fieldCoverage: number;
  
  // Deal-related metrics
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  openDeals: number;
  
  // Financial metrics
  totalRevenue: number;
  avgDealSize: number;
  cashCollected: number;
  
  // Meeting metrics
  totalMeetings: number;
  meetingsAttended: number;
  meetingsCanceled: number;
  
  // Activity metrics
  totalActivities: number;
  
  // Team performance
  salesTeam: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    deals: number;
    revenue: number;
    meetings: number;
  }>;
  
  // Previous period data for comparisons
  previousPeriod?: {
    totalContacts: number;
    totalDeals: number;
    totalRevenue: number;
    cashCollected: number;
  };
}

interface DashboardContextType {
  dashboardData: DashboardData | null;
  isLoading: boolean;
  error: Error | null;
  selectedUserId?: string;
  setSelectedUserId: (userId?: string) => void;
  refreshData: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

interface DashboardProviderProps {
  children: ReactNode;
}

export function DashboardProvider({ children }: DashboardProviderProps) {
  const { dateRange } = useDateContext();
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  
  // Use our custom hook to fetch dashboard data
  const { 
    data: dashboardData, 
    isLoading, 
    error,
    refetch: refreshData
  } = useDashboardData(dateRange, selectedUserId);

  return (
    <DashboardContext.Provider 
      value={{ 
        dashboardData, 
        isLoading, 
        error,
        selectedUserId,
        setSelectedUserId,
        refreshData
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  
  return context;
}