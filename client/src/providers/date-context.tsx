import React, { createContext, useContext, useState, useEffect } from 'react';

// Initial date range (default to current month)
const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

// Date context interface
interface DateContextType {
  startDate: Date;
  endDate: Date;
  setDateRange: (start: Date, end: Date) => void;
  comparePreviousPeriod: boolean;
  setComparePreviousPeriod: (compare: boolean) => void;
  previousStartDate: Date | null;
  previousEndDate: Date | null;
  dateRangePreset: string;
  setDateRangePreset: (preset: string) => void;
}

// Create context with default values
const DateContext = createContext<DateContextType>({
  startDate: firstDayOfMonth,
  endDate: lastDayOfMonth,
  setDateRange: () => {},
  comparePreviousPeriod: false,
  setComparePreviousPeriod: () => {},
  previousStartDate: null,
  previousEndDate: null,
  dateRangePreset: 'this-month',
  setDateRangePreset: () => {},
});

// Props for the provider
interface DateProviderProps {
  children: React.ReactNode;
}

/**
 * DateProvider - Provides date context for the dashboard
 */
export function DateProvider({ children }: DateProviderProps) {
  // State for current date range
  const [startDate, setStartDate] = useState<Date>(firstDayOfMonth);
  const [endDate, setEndDate] = useState<Date>(lastDayOfMonth);
  
  // State for comparison
  const [comparePreviousPeriod, setComparePreviousPeriod] = useState<boolean>(false);
  const [previousStartDate, setPreviousStartDate] = useState<Date | null>(null);
  const [previousEndDate, setPreviousEndDate] = useState<Date | null>(null);
  
  // Track the selected preset
  const [dateRangePreset, setDateRangePreset] = useState<string>('this-month');

  // Set date range function
  const setDateRange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
    
    // Calculate previous period dates
    const dayDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - dayDiff);
    
    setPreviousStartDate(prevStart);
    setPreviousEndDate(prevEnd);
  };
  
  // Effect to set initial previous period dates
  useEffect(() => {
    if (comparePreviousPeriod && !previousStartDate) {
      const dayDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const prevEnd = new Date(startDate);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - dayDiff);
      
      setPreviousStartDate(prevStart);
      setPreviousEndDate(prevEnd);
    }
  }, [comparePreviousPeriod, startDate, endDate, previousStartDate]);

  return (
    <DateContext.Provider 
      value={{
        startDate,
        endDate,
        setDateRange,
        comparePreviousPeriod,
        setComparePreviousPeriod,
        previousStartDate,
        previousEndDate,
        dateRangePreset,
        setDateRangePreset,
      }}
    >
      {children}
    </DateContext.Provider>
  );
}

/**
 * Hook to use the date context
 */
export function useDateContext() {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error('useDateContext must be used within a DateProvider');
  }
  return context;
}