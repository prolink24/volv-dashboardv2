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

export const useDateContext = () => useContext(DateContext);

export function DateContextProvider({ children }: { children: React.ReactNode }) {
  const [currentRange, setCurrentRange] = useState<DateRange>(defaultCurrentRange);
  const [previousRange, setPreviousRange] = useState<DateRange | null>(defaultPreviousRange);

  const setDateRange = (current: DateRange, previous: DateRange | null) => {
    setCurrentRange(current);
    setPreviousRange(previous);
  };

  return (
    <DateContext.Provider value={{ currentRange, previousRange, setDateRange }}>
      {children}
    </DateContext.Provider>
  );
}