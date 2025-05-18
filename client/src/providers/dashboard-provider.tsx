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
  initialUserFilter?: string;
}

export const DashboardProvider = ({ 
  children, 
  initialUserFilter = "All Users" 
}: DashboardProviderProps) => {
  const [userFilter, setUserFilter] = useState<string>(initialUserFilter);
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
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
};

export default DashboardProvider;