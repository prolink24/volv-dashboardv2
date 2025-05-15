import { createContext, useState, useContext, ReactNode, useEffect, useCallback } from "react";
import { useLocation, useRoute } from "wouter";

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
  refreshData: () => void;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

/**
 * Props for the DateProvider component
 */
interface DateProviderProps {
  children: ReactNode;
}

/**
 * Function to get the default date range
 */
function getDefaultDateRange(): DateRange {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  return {
    startDate: firstDay,
    endDate: lastDay,
    label: `${firstDay.toLocaleDateString('en-US', { month: 'long' })} ${firstDay.getFullYear()}`
  };
}

/**
 * Function to parse URL params to get date range
 */
function getDateRangeFromUrl(): DateRange | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const startParam = params.get('startDate');
    const endParam = params.get('endDate');
    const presetParam = params.get('preset');
    
    if (startParam && endParam) {
      const startDate = new Date(startParam);
      const endDate = new Date(endParam);
      
      // Validate dates are valid
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.warn("[DateContext] Invalid dates in URL params");
        return null;
      }
      
      // Generate label
      let label;
      if (startDate.toDateString() === endDate.toDateString()) {
        // Same day
        label = startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      } else if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
        // Same month
        label = `${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${endDate.getDate()}, ${endDate.getFullYear()}`;
      } else {
        // Different months
        label = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
      
      return {
        startDate,
        endDate,
        label,
        preset: presetParam || undefined
      };
    }
  } catch (error) {
    console.error("[DateContext] Error parsing URL params:", error);
  }
  
  return null;
}

/**
 * Function to update URL params with date range
 */
function updateUrlWithDateRange(range: DateRange, navigate: (to: string) => void, currentPath: string): void {
  try {
    const currentParams = new URLSearchParams(window.location.search);
    
    // Update date parameters
    currentParams.set('startDate', range.startDate.toISOString());
    currentParams.set('endDate', range.endDate.toISOString());
    
    // Set or remove preset parameter
    if (range.preset) {
      currentParams.set('preset', range.preset);
    } else {
      currentParams.delete('preset');
    }
    
    // Build new URL without reloading page
    const newUrl = `${currentPath}?${currentParams.toString()}`;
    window.history.pushState({}, '', newUrl);
    
    // No need to actually navigate with wouter since we're just updating params
  } catch (error) {
    console.error("[DateContext] Error updating URL params:", error);
  }
}

/**
 * Provider component for global date context
 */
export function DateProvider({ children }: DateProviderProps) {
  // Access wouter's location and navigation
  const [location] = useLocation();
  const [, navigate] = useRoute("*");
  
  // Initialize state with default or saved range
  const [dateRange, setDateRangeState] = useState<DateRange>(() => {
    // Try to get date range from URL first (highest priority)
    const urlRange = getDateRangeFromUrl();
    if (urlRange) {
      console.log("[DateContext] Using date range from URL params:", urlRange);
      return urlRange;
    }
    
    // Try to get from localStorage next
    try {
      const savedRange = localStorage.getItem('app_date_range');
      if (savedRange) {
        const parsed = JSON.parse(savedRange);
        const restored = {
          ...parsed,
          startDate: new Date(parsed.startDate),
          endDate: new Date(parsed.endDate)
        };
        console.log("[DateContext] Using date range from localStorage:", restored);
        return restored;
      }
    } catch (error) {
      console.error("[DateContext] Error loading saved date range:", error);
    }
    
    // Fall back to default range
    return getDefaultDateRange();
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Sync with URL when location changes
  useEffect(() => {
    const urlRange = getDateRangeFromUrl();
    if (urlRange) {
      const currentStartIso = dateRange.startDate.toISOString();
      const currentEndIso = dateRange.endDate.toISOString();
      const urlStartIso = urlRange.startDate.toISOString();
      const urlEndIso = urlRange.endDate.toISOString();
      
      // Only update if different to avoid infinite loops
      if (currentStartIso !== urlStartIso || currentEndIso !== urlEndIso) {
        console.log("[DateContext] Updating state from URL change");
        setDateRangeState(urlRange);
        
        // Also update localStorage
        try {
          localStorage.setItem('app_date_range', JSON.stringify(urlRange));
        } catch (error) {
          console.error("[DateContext] Error saving date range to localStorage:", error);
        }
      }
    }
  }, [location]);
  
  // Refresh data function
  const refreshData = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);
  
  // Enhanced setter that includes persistence
  const setDateRange = useCallback((range: DateRange) => {
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
    
    // Update URL params
    updateUrlWithDateRange(range, navigate, location);
    
    // Debounce the loading indicator to prevent flashing on fast loads
    setTimeout(() => setIsLoading(false), 300);
  }, [navigate, location]);
  
  return (
    <DateContext.Provider value={{ 
      dateRange, 
      setDateRange, 
      isLoading,
      refreshData
    }}>
      {children}
    </DateContext.Provider>
  );
}

/**
 * Hook for accessing the date range context
 * @returns The date context with dateRange, setDateRange, isLoading and refreshData
 */
export function useDateRange() {
  const context = useContext(DateContext);
  
  if (context === undefined) {
    throw new Error("useDateRange must be used within a DateProvider");
  }
  
  return context;
}