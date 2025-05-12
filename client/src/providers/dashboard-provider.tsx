import { createContext, useState, useContext, ReactNode } from "react";

interface DashboardContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  dateFilter: string;
  setDateFilter: (date: string) => void;
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
  const [dateFilter, setDateFilter] = useState<string>("2025-03 | March");
  const [userFilter, setUserFilter] = useState<string>("All Users");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  const refreshData = async () => {
    setIsRefreshing(true);
    
    try {
      // Make API call to refresh data here
      await fetch("/api/sync/all", {
        method: "POST",
        credentials: "include",
      });
      
      // Invalidate queries or refresh data as needed
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  return (
    <DashboardContext.Provider
      value={{
        activeTab,
        setActiveTab,
        dateFilter,
        setDateFilter,
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
