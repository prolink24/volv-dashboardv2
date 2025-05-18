import React, { createContext, useContext, useState } from 'react';

// Set default date range (last 30 days)
const now = new Date();
const defaultStartDate = new Date(now);
defaultStartDate.setDate(now.getDate() - 30);
const defaultEndDate = new Date(now);

interface DateContextType {
  startDate: Date;
  endDate: Date;
  comparePreviousPeriod: boolean;
  setDateRange: (start: Date, end: Date) => void;
  setComparePreviousPeriod: (compare: boolean) => void;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

interface DateProviderProps {
  children: React.ReactNode;
}

export function DateProvider({ children }: DateProviderProps) {
  const [startDate, setStartDate] = useState<Date>(defaultStartDate);
  const [endDate, setEndDate] = useState<Date>(defaultEndDate);
  const [comparePreviousPeriod, setComparePreviousPeriod] = useState<boolean>(true);

  const setDateRange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <DateContext.Provider
      value={{
        startDate,
        endDate,
        comparePreviousPeriod,
        setDateRange,
        setComparePreviousPeriod,
      }}
    >
      {children}
    </DateContext.Provider>
  );
}

export function useDateContext() {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error('useDateContext must be used within a DateProvider');
  }
  return context;
}