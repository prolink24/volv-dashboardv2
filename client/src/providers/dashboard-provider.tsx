import React, { createContext, useContext, useEffect, useState } from 'react';
import { useDashboardData, useAttributionStats, type DashboardData, type AttributionStats } from '@/hooks/use-dashboard-data';
import { useDateRange } from './date-context';
import { useToast } from '@/hooks/use-toast';

interface DashboardContextType {
  dashboardData: DashboardData | undefined;
  attributionStats: AttributionStats | undefined;
  isLoading: boolean;
  isError: boolean;
  refreshDashboard: () => void;
  selectedUserId: string | undefined;
  setSelectedUserId: (userId: string | undefined) => void;
  useEnhancedMode: boolean;
  setUseEnhancedMode: (mode: boolean) => void;
}

const DashboardContext = createContext<DashboardContextType>({
  dashboardData: undefined,
  attributionStats: undefined,
  isLoading: false,
  isError: false,
  refreshDashboard: () => {},
  selectedUserId: undefined,
  setSelectedUserId: () => {},
  useEnhancedMode: true,
  setUseEnhancedMode: () => {},
});

export const useDashboard = () => useContext(DashboardContext);

interface DashboardProviderProps {
  children: React.ReactNode;
}

export const DashboardProvider: React.FC<DashboardProviderProps> = ({ children }) => {
  const { dateRange } = useDateRange();
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [useEnhancedMode, setUseEnhancedMode] = useState<boolean>(true);
  const { toast } = useToast();
  
  // Fetch dashboard data with selected filters
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    isError: isDashboardError,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useDashboardData({
    userId: selectedUserId,
    useEnhanced: useEnhancedMode,
  });
  
  // Fetch attribution stats
  const {
    data: attributionStats,
    isLoading: isAttributionLoading,
    isError: isAttributionError,
    error: attributionError,
    refetch: refetchAttribution,
  } = useAttributionStats();
  
  // Combined loading and error states
  const isLoading = isDashboardLoading || isAttributionLoading;
  const isError = isDashboardError || isAttributionError;
  
  // Refresh all dashboard data
  const refreshDashboard = () => {
    refetchDashboard();
    refetchAttribution();
    toast({
      title: 'Refreshing Dashboard',
      description: 'Fetching the latest data...',
      variant: 'default',
    });
  };
  
  // Show error notifications
  useEffect(() => {
    if (isDashboardError && dashboardError) {
      toast({
        title: 'Dashboard Error',
        description: `Failed to load dashboard data: ${dashboardError.message}`,
        variant: 'destructive',
      });
    }
    
    if (isAttributionError && attributionError) {
      toast({
        title: 'Attribution Error',
        description: `Failed to load attribution stats: ${attributionError.message}`,
        variant: 'destructive',
      });
    }
  }, [isDashboardError, isAttributionError, dashboardError, attributionError, toast]);
  
  // When date range changes, refresh data
  useEffect(() => {
    // Only refetch if we've loaded data before
    if (dashboardData || attributionStats) {
      refreshDashboard();
    }
  }, [dateRange.startDate, dateRange.endDate]);
  
  const value = {
    dashboardData,
    attributionStats,
    isLoading,
    isError,
    refreshDashboard,
    selectedUserId,
    setSelectedUserId,
    useEnhancedMode,
    setUseEnhancedMode,
  };
  
  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};