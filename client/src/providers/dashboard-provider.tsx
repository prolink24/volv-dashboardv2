import React, { createContext, useContext } from 'react';
import { useDashboardData, useAttributionStats, useSalesTeamData } from '@/hooks/use-dashboard-data';
import { useDateContext } from './date-context';

// Create context
const DashboardContext = createContext<ReturnType<typeof useDashboardState> | undefined>(undefined);

// Hook to manage dashboard state
function useDashboardState() {
  const { startDate, endDate, comparePreviousPeriod } = useDateContext();
  const [selectedUserId, setSelectedUserId] = React.useState<string | undefined>(undefined);
  
  // Fetch dashboard data
  const dashboardQuery = useDashboardData(selectedUserId);
  const attributionQuery = useAttributionStats();
  const salesTeamQuery = useSalesTeamData();
  
  // Loading state
  const isLoading = 
    dashboardQuery.isLoading || 
    attributionQuery.isLoading || 
    salesTeamQuery.isLoading;
  
  // Error state
  const error = 
    dashboardQuery.error || 
    attributionQuery.error || 
    salesTeamQuery.error;
  
  // Create derived data for dashboard
  const salesTeamMembers = salesTeamQuery.data?.salesTeam || [];
  
  // Function to change selected user
  const selectUser = (userId: string | undefined) => {
    setSelectedUserId(userId);
  };
  
  return {
    // Date range info
    dateRange: { startDate, endDate, comparePreviousPeriod },
    
    // User filtering
    selectedUserId,
    selectUser,
    salesTeamMembers,
    
    // Raw data
    dashboardData: dashboardQuery.data,
    attributionStats: attributionQuery.data,
    
    // Query state
    isLoading,
    error,
    
    // Refetch functions
    refetchDashboard: dashboardQuery.refetch,
    refetchAttribution: attributionQuery.refetch,
    refetchSalesTeam: salesTeamQuery.refetch,
  };
}

// Provider component
export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dashboardState = useDashboardState();
  
  return (
    <DashboardContext.Provider value={dashboardState}>
      {children}
    </DashboardContext.Provider>
  );
};

// Hook to use the dashboard context
export const useDashboard = () => {
  const context = useContext(DashboardContext);
  
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  
  return context;
};