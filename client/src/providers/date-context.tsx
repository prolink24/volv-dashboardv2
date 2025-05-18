import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

interface DateContextType {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

interface DateProviderProps {
  children: ReactNode;
  initialDateRange?: DateRange;
}

export function DateProvider({ 
  children, 
  initialDateRange = {
    // Default to last 30 days
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  }
}: DateProviderProps) {
  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange);

  return (
    <DateContext.Provider value={{ dateRange, setDateRange }}>
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