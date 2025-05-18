import { createContext, useState, useContext, ReactNode, useEffect } from "react";
import { useDateRange } from "@/providers/date-context";
import { invalidateDashboardData } from "@/hooks/use-dashboard-data";

interface DashboardContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userFilter: string;
  setUserFilter: (user: string) => void;
  refreshData: () => void;
  isRefreshing: boolean;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

interface DashboardProviderProps {
  children: ReactNode;
}

export function DashboardProvider({ children }: DashboardProviderProps) {
  const [activeTab, setActiveTab] = useState<string>("team-performance");
  const [userFilter, setUserFilter] = useState<string>("All Users");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  // Get the date context
  const { refreshData: refreshDateData } = useDateRange();

  // Refresh all data
  const refreshData = async () => {
    console.log("[DashboardProvider] Refreshing all dashboard data");
    setIsRefreshing(true);
    
    try {
      // Invalidate cache first
      await invalidateDashboardData();
      
      // Make API call to refresh data
      const response = await fetch("/api/sync/all", {
        method: "POST",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`API sync failed: ${response.status} ${response.statusText}`);
      }
      
      // Trigger refresh in date context too
      refreshDateData();
      
      console.log("[DashboardProvider] Data refresh complete");
    } catch (error) {
      console.error("[DashboardProvider] Error refreshing data:", error);
    } finally {
      // Debounce to avoid UI flicker
      setTimeout(() => {
        setIsRefreshing(false);
      }, 300);
    }
  };
  
  return (
    <DashboardContext.Provider
      value={{
        activeTab,
        setActiveTab,
        userFilter,
        setUserFilter,
        refreshData,
        isRefreshing,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  
  return context;
}
