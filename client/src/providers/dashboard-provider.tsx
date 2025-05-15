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
  
  // Calculate current date with full format
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(now);
  const currentMonthFilter = `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day} | ${monthName} ${day}`;
  
  const [dateFilter, setDateFilter] = useState<string>(currentMonthFilter);
  const [userFilter, setUserFilter] = useState<string>("All Users");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  // Add a wrapper for setDateFilter to include debugging
  const updateDateFilter = (newDate: string) => {
    console.log(`[DashboardProvider] Updating date filter to: ${newDate}`);
    setDateFilter(newDate);
    // Force a rerender/refresh when date filter changes
    setTimeout(() => {
      console.log(`[DashboardProvider] Date filter updated, value is now: ${newDate}`);
    }, 100);
  };
  
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
        setDateFilter: updateDateFilter, // Use our enhanced version with debugging
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
