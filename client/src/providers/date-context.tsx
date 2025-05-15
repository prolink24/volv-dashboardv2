import { createContext, useContext, ReactNode } from 'react';
import { useDateRange, type DateRange } from '@/hooks/use-date-range';

/**
 * DateRangeContext provides the global date range state to all components
 */
export const DateRangeContext = createContext<ReturnType<typeof useDateRange> | undefined>(undefined);

/**
 * DateRangeProvider wraps the application with the DateRangeContext
 */
export function DateRangeProvider({ children }: { children: ReactNode }) {
  const dateRangeState = useDateRange();

  return (
    <DateRangeContext.Provider value={dateRangeState}>
      {children}
    </DateRangeContext.Provider>
  );
}

/**
 * useDateRangeContext is a hook to access the date range context
 */
export function useDateRangeContext() {
  const context = useContext(DateRangeContext);
  
  if (context === undefined) {
    throw new Error('useDateRangeContext must be used within a DateRangeProvider');
  }
  
  return context;
}

/**
 * Using the custom hook directly from the original hook module is recommended 
 * for consistency, but this re-export is provided for convenience
 */
export { useDateRange, type DateRange };