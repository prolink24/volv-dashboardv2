import { createContext, useState, useContext, ReactNode } from "react";

interface DashboardContextProps {
  userFilter: string;
  setUserFilter: (user: string) => void;
  refreshData: boolean;
  setRefreshData: (refresh: boolean) => void;
  isRefreshing: boolean;
  setIsRefreshing: (refreshing: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const DashboardContext = createContext<DashboardContextProps>({
  userFilter: "All Users",
  setUserFilter: () => {},
  refreshData: false,
  setRefreshData: () => {},
  isRefreshing: false,
  setIsRefreshing: () => {},
  activeTab: "overview",
  setActiveTab: () => {}
});

interface DashboardProviderProps {
  children: ReactNode;
}

export function DashboardProvider({ children }: DashboardProviderProps) {
  const [userFilter, setUserFilter] = useState<string>("All Users");
  const [refreshData, setRefreshData] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("overview");

  return (
    <DashboardContext.Provider
      value={{
        userFilter,
        setUserFilter,
        refreshData,
        setRefreshData,
        isRefreshing,
        setIsRefreshing,
        activeTab,
        setActiveTab
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}

export default DashboardProvider;