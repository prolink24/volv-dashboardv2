import React, { createContext, useContext, useState, useCallback } from 'react';
import { useDashboardData, useAttributionStats, DashboardData, AttributionStats } from '@/hooks/use-dashboard-data';
import { useDateRange } from '@/providers/date-context';
import { useQuery } from '@tanstack/react-query';

// Define the dashboard context type
interface DashboardContextType {
  dashboardData: DashboardData | undefined;
  attributionStats: AttributionStats | undefined;
  isLoading: boolean;
  error: Error | null;
  refreshDashboard: () => Promise<void>;
  useEnhancedMode: boolean;
  setUseEnhancedMode: (enabled: boolean) => void;
  selectedUserId: string | undefined;
  setSelectedUserId: (userId: string | undefined) => void;
}

// Create the context with default values
const DashboardContext = createContext<DashboardContextType>({
  dashboardData: undefined,
  attributionStats: undefined,
  isLoading: false,
  error: null,
  refreshDashboard: async () => {},
  useEnhancedMode: true,
  setUseEnhancedMode: () => {},
  selectedUserId: undefined,
  setSelectedUserId: () => {},
});

// Create a hook to use the dashboard context
export const useDashboard = () => useContext(DashboardContext);

// Props interface for the DashboardProvider
interface DashboardProviderProps {
  children: React.ReactNode;
}

// Create the DashboardProvider component
export const DashboardProvider: React.FC<DashboardProviderProps> = ({ children }) => {
  // State for enhanced mode and selected user
  const [useEnhancedMode, setUseEnhancedMode] = useState<boolean>(true);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  
  // Get the current date range from the DateProvider
  const { dateRange } = useDateRange();
  
  // Fetch dashboard data with the current filters
  const { 
    data: dashboardData, 
    isLoading: isDashboardLoading, 
    error: dashboardError,
    refetch: refetchDashboard
  } = useDashboardData({
    userId: selectedUserId,
    useEnhanced: useEnhancedMode,
  });
  
  // Fetch attribution stats
  const {
    data: attributionStats,
    isLoading: isAttributionLoading,
    error: attributionError,
    refetch: refetchAttribution
  } = useAttributionStats();
  
  // Combined loading state
  const isLoading = isDashboardLoading || isAttributionLoading;
  
  // Combined error state
  const error = dashboardError || attributionError || null;
  
  // Function to refresh all dashboard data
  const refreshDashboard = useCallback(async (): Promise<void> => {
    await Promise.all([
      refetchDashboard(),
      refetchAttribution()
    ]);
  }, [refetchDashboard, refetchAttribution]);
  
  // Create the context value
  const contextValue: DashboardContextType = {
    dashboardData,
    attributionStats,
    isLoading,
    error,
    refreshDashboard,
    useEnhancedMode,
    setUseEnhancedMode,
    selectedUserId,
    setSelectedUserId,
  };
  
  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
};