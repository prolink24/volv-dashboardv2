import { createContext, useState, useContext, ReactNode, useEffect } from "react";

/**
 * DateRange interface for standardized date range handling across the application
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string; // User-friendly representation (e.g., "May 1-15, 2025")
  preset?: string; // Optional preset identifier (e.g., "last7days", "thisMonth")
}

/**
 * Context interface for date range management
 */
interface DateContextType {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  isLoading: boolean;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

/**
 * Props for the DateProvider component
 */
interface DateProviderProps {
  children: ReactNode;
}

/**
 * Provider component for global date context
 */
export function DateProvider({ children }: DateProviderProps) {
  // Initialize with current month
  const [dateRange, setDateRangeState] = useState<DateRange>(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return {
      startDate: firstDay,
      endDate: lastDay,
      label: `${firstDay.toLocaleDateString('en-US', { month: 'long' })} ${firstDay.getFullYear()}`
    };
  });
  
  const [isLoading, setIsLoading] = useState(false);
  
  // Persist date range in localStorage
  useEffect(() => {
    try {
      const savedRange = localStorage.getItem('app_date_range');
      if (savedRange) {
        const parsed = JSON.parse(savedRange);
        setDateRangeState({
          ...parsed,
          startDate: new Date(parsed.startDate),
          endDate: new Date(parsed.endDate)
        });
        console.log("[DateContext] Loaded saved date range from localStorage");
      }
    } catch (error) {
      console.error("[DateContext] Error loading saved date range:", error);
    }
  }, []);
  
  // Enhanced setter that includes persistence
  const setDateRange = (range: DateRange) => {
    console.log("[DateContext] Setting date range:", range);
    setIsLoading(true);
    
    // Update state
    setDateRangeState(range);
    
    // Save to localStorage
    try {
      localStorage.setItem('app_date_range', JSON.stringify(range));
    } catch (error) {
      console.error("[DateContext] Error saving date range:", error);
    }
    
    // Debounce the loading indicator to prevent flashing on fast loads
    setTimeout(() => setIsLoading(false), 300);
  };
  
  return (
    <DateContext.Provider value={{ dateRange, setDateRange, isLoading }}>
      {children}
    </DateContext.Provider>
  );
}

/**
 * Hook for accessing the date range context
 * @returns The date context with dateRange, setDateRange and isLoading
 */
export function useDateRange() {
  const context = useContext(DateContext);
  
  if (context === undefined) {
    throw new Error("useDateRange must be used within a DateProvider");
  }
  
  return context;
}