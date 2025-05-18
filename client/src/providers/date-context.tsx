import React, { createContext, useContext, useState } from 'react';

// Type definitions for our context
interface DateContextType {
  startDate: Date;
  endDate: Date;
  setDateRange: (start: Date, end: Date) => void;
  comparePreviousPeriod: boolean;
  setComparePreviousPeriod: (compare: boolean) => void;
}

// Create the context with default values
const DateContext = createContext<DateContextType>({
  startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of current month
  endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), // Last day of current month
  setDateRange: () => {},
  comparePreviousPeriod: false,
  setComparePreviousPeriod: () => {},
});

// Provider component
export const DateContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to current month
  const currentDate = new Date();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  // Initialize state
  const [startDate, setStartDate] = useState<Date>(firstDayOfMonth);
  const [endDate, setEndDate] = useState<Date>(lastDayOfMonth);
  const [comparePreviousPeriod, setComparePreviousPeriod] = useState<boolean>(false);
  
  // Function to update date range
  const setDateRange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };
  
  // Context value
  const value = {
    startDate,
    endDate,
    setDateRange,
    comparePreviousPeriod,
    setComparePreviousPeriod,
  };
  
  return <DateContext.Provider value={value}>{children}</DateContext.Provider>;
};

// Custom hook to use the date context
export const useDateContext = () => {
  const context = useContext(DateContext);
  
  if (context === undefined) {
    throw new Error('useDateContext must be used within a DateContextProvider');
  }
  
  return context;
};