import React, { createContext, useContext, useState } from 'react';

// Date context type definition
export interface DateContextType {
  startDate: Date | null;
  endDate: Date | null;
  includePreviousPeriod: boolean;
  setDateRange: (start: Date | null, end: Date | null) => void;
  setIncludePreviousPeriod: (include: boolean) => void;
}

// Create the context with default values
const DateContext = createContext<DateContextType>({
  startDate: null,
  endDate: null,
  includePreviousPeriod: true,
  setDateRange: () => {},
  setIncludePreviousPeriod: () => {},
});

// Hook to use the date context
export const useDateContext = () => useContext(DateContext);

// Define the provider component
export function DateContextProvider({ children }: { children: React.ReactNode }) {
  // Default to current month
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  // State for the date range
  const [startDate, setStartDate] = useState<Date | null>(startOfMonth);
  const [endDate, setEndDate] = useState<Date | null>(endOfMonth);
  const [includePreviousPeriod, setIncludePreviousPeriod] = useState<boolean>(true);
  
  // Function to set both dates at once
  const setDateRange = (start: Date | null, end: Date | null) => {
    setStartDate(start);
    setEndDate(end);
  };
  
  return (
    <DateContext.Provider
      value={{
        startDate,
        endDate,
        includePreviousPeriod,
        setDateRange,
        setIncludePreviousPeriod,
      }}
    >
      {children}
    </DateContext.Provider>
  );
}