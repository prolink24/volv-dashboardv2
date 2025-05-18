import React, { createContext, useContext, useState } from 'react';

export type SalesTeamMember = {
  id: string;
  name: string;
  role: string;
  deals: number;
  meetings: number;
  activities: number;
  performance: number;
  closed: number;
  cashCollected: number;
  revenue: number;
  contractedValue: number;
  calls: number;
  closingRate: number;
};

export type DashboardData = {
  totalContacts: number;
  totalRevenue: number;
  totalCashCollected: number;
  totalDeals: number;
  totalMeetings: number;
  totalActivities: number;
  conversionRate: number;
  multiSourceRate: number;
  cashCollectedRate: number;
  salesTeam: SalesTeamMember[];
};

export type DashboardContextType = {
  currentPeriod: DashboardData;
  previousPeriod: DashboardData | null;
  selectedUserId: string | null;
  setSelectedUserId: (userId: string | null) => void;
  isLoading: boolean;
  error: string | null;
};

const defaultDashboardData: DashboardData = {
  totalContacts: 0,
  totalRevenue: 0,
  totalCashCollected: 0,
  totalDeals: 0,
  totalMeetings: 0,
  totalActivities: 0,
  conversionRate: 0,
  multiSourceRate: 0,
  cashCollectedRate: 0,
  salesTeam: [],
};

export const DashboardContext = createContext<DashboardContextType>({
  currentPeriod: defaultDashboardData,
  previousPeriod: null,
  selectedUserId: null,
  setSelectedUserId: () => {},
  isLoading: false,
  error: null,
});

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPeriod, setCurrentPeriod] = useState<DashboardData>(defaultDashboardData);
  const [previousPeriod, setPreviousPeriod] = useState<DashboardData | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <DashboardContext.Provider
      value={{
        currentPeriod,
        previousPeriod,
        selectedUserId,
        setSelectedUserId,
        isLoading,
        error,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => useContext(DashboardContext);