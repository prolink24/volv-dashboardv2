import React, { createContext, useContext, useState } from 'react';
import { useDashboardData, type SalesTeamMember } from '@/hooks/use-dashboard-data';

// Define the type for dashboard context
interface DashboardContextType {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  salesTeam: SalesTeamMember[];
  selectedUserId: string | null;
  setSelectedUserId: (userId: string | null) => void;
  refetchDashboard: () => Promise<void>;
}

// Create the context with default values
const DashboardContext = createContext<DashboardContextType>({
  isLoading: false,
  isError: false,
  error: null,
  salesTeam: [],
  selectedUserId: null,
  setSelectedUserId: () => {},
  refetchDashboard: async () => {},
});

// Props for the dashboard provider
interface DashboardProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component for dashboard data and state
 */
export function DashboardProvider({ children }: DashboardProviderProps) {
  // State for user selection
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Fetch dashboard data using the hook
  const {
    dashboardData,
    salesTeam = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useDashboardData(selectedUserId || undefined);
  
  // Refetch dashboard data
  const refetchDashboard = async () => {
    await refetch();
  };
  
  // Context value
  const value: DashboardContextType = {
    isLoading,
    isError,
    error,
    salesTeam,
    selectedUserId,
    setSelectedUserId,
    refetchDashboard,
  };
  
  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

/**
 * Hook to use the dashboard context
 */
export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}