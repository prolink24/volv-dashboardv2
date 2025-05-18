import React, { createContext, useContext, useState } from 'react';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  label?: string;
}

export interface DateContextType {
  currentRange: DateRange;
  previousRange: DateRange | null;
  setDateRange: (current: DateRange, previous: DateRange | null) => void;
}

export interface DateRangeContextType {
  dateRange: DateRange;
  isLoading: boolean;
  setDateRange: (range: DateRange) => void;
  comparePreviousPeriod: boolean;
  setComparePreviousPeriod: (compare: boolean) => void;
}

const defaultCurrentRange: DateRange = {
  startDate: startOfMonth(new Date()),
  endDate: endOfMonth(new Date()),
  label: 'This Month'
};

const defaultPreviousRange: DateRange = {
  startDate: startOfMonth(subMonths(new Date(), 1)),
  endDate: endOfMonth(subMonths(new Date(), 1)),
};

const DateContext = createContext<DateContextType>({
  currentRange: defaultCurrentRange,
  previousRange: defaultPreviousRange,
  setDateRange: () => {},
});

// Create separate context for the alternative interface
const DateRangeContext = createContext<DateRangeContextType>({
  dateRange: defaultCurrentRange,
  isLoading: false,
  setDateRange: () => {},
  comparePreviousPeriod: true,
  setComparePreviousPeriod: () => {},
});

export const useDateContext = () => useContext(DateContext);
export const useDateRange = () => useContext(DateRangeContext);

export function DateContextProvider({ children }: { children: React.ReactNode }) {
  const [currentRange, setCurrentRange] = useState<DateRange>(defaultCurrentRange);
  const [previousRange, setPreviousRange] = useState<DateRange | null>(defaultPreviousRange);
  const [isLoading, setIsLoading] = useState(false);
  const [comparePreviousPeriod, setComparePreviousPeriod] = useState(true);

  const setDateRange = (current: DateRange, previous: DateRange | null) => {
    setCurrentRange(current);
    setPreviousRange(previous);
  };

  // Compatibility function for the alternative interface
  const setCompatDateRange = (range: DateRange) => {
    setIsLoading(true);
    setCurrentRange(range);
    
    if (comparePreviousPeriod) {
      // Calculate previous period based on current selection
      const diffInDays = Math.round((range.endDate.getTime() - range.startDate.getTime()) / (1000 * 60 * 60 * 24));
      const prevStart = new Date(range.startDate);
      prevStart.setDate(prevStart.getDate() - diffInDays - 1);
      const prevEnd = new Date(range.endDate);
      prevEnd.setDate(prevEnd.getDate() - diffInDays - 1);
      
      setPreviousRange({
        startDate: prevStart,
        endDate: prevEnd,
      });
    } else {
      setPreviousRange(null);
    }
    
    setTimeout(() => setIsLoading(false), 300);
  };

  return (
    <DateContext.Provider value={{ currentRange, previousRange, setDateRange }}>
      <DateRangeContext.Provider 
        value={{ 
          dateRange: currentRange, 
          isLoading, 
          setDateRange: setCompatDateRange,
          comparePreviousPeriod,
          setComparePreviousPeriod
        }}
      >
        {children}
      </DateRangeContext.Provider>
    </DateContext.Provider>
  );
}