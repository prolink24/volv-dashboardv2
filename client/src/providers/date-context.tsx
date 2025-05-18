import React, { createContext, useState, useContext, ReactNode, useEffect } from "react";
import { add, sub, format, isValid, parseISO } from "date-fns";

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface DateContextProps {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  presets: Record<string, DateRange>;
  selectedPreset: string | null;
  setSelectedPreset: (preset: string | null) => void;
}

const DateContext = createContext<DateContextProps>({
  dateRange: {
    startDate: sub(new Date(), { months: 1 }),
    endDate: new Date(),
  },
  setDateRange: () => {},
  presets: {},
  selectedPreset: null,
  setSelectedPreset: () => {},
});

interface DateProviderProps {
  children: ReactNode;
}

const LOCAL_STORAGE_KEY = "crm-dashboard-date-range";

export function DateProvider({ children }: DateProviderProps) {
  // Initialize with default date range (last 30 days)
  const [dateRange, setDateRangeState] = useState<DateRange>({
    startDate: sub(new Date(), { months: 1 }),
    endDate: new Date(),
  });

  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  // Date range presets
  const presets: Record<string, DateRange> = {
    "Today": {
      startDate: new Date(),
      endDate: new Date(),
    },
    "Yesterday": {
      startDate: sub(new Date(), { days: 1 }),
      endDate: sub(new Date(), { days: 1 }),
    },
    "Last 7 days": {
      startDate: sub(new Date(), { days: 6 }),
      endDate: new Date(),
    },
    "Last 30 days": {
      startDate: sub(new Date(), { days: 29 }),
      endDate: new Date(),
    },
    "This month": {
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      endDate: new Date(),
    },
    "Last month": {
      startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
      endDate: new Date(new Date().getFullYear(), new Date().getMonth(), 0),
    },
    "This quarter": {
      startDate: new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3, 1),
      endDate: new Date(),
    },
    "Last quarter": {
      startDate: new Date(
        new Date().getFullYear(),
        Math.floor(new Date().getMonth() / 3) * 3 - 3,
        1
      ),
      endDate: new Date(
        new Date().getFullYear(),
        Math.floor(new Date().getMonth() / 3) * 3,
        0
      ),
    },
    "This year": {
      startDate: new Date(new Date().getFullYear(), 0, 1),
      endDate: new Date(),
    },
    "Last year": {
      startDate: new Date(new Date().getFullYear() - 1, 0, 1),
      endDate: new Date(new Date().getFullYear() - 1, 11, 31),
    },
    "All time": {
      startDate: new Date(2020, 0, 1),
      endDate: new Date(),
    },
  };

  // Load date range from localStorage on initial render
  useEffect(() => {
    const savedRange = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedRange) {
      try {
        const { startDate, endDate, preset } = JSON.parse(savedRange);
        
        // Ensure dates are valid
        const parsedStartDate = parseISO(startDate);
        const parsedEndDate = parseISO(endDate);
        
        if (isValid(parsedStartDate) && isValid(parsedEndDate)) {
          setDateRangeState({ 
            startDate: parsedStartDate, 
            endDate: parsedEndDate 
          });
          
          // Restore preset if available
          if (preset && preset in presets) {
            setSelectedPreset(preset);
          }
        }
      } catch (error) {
        console.error("Error parsing saved date range:", error);
        // If there's an error, just use the default range
      }
    } else {
      // Default to "Last 30 days" if no saved range
      setSelectedPreset("Last 30 days");
      setDateRangeState(presets["Last 30 days"]);
    }
  }, []);

  // Custom wrapper to update the state and save to localStorage
  const setDateRange = (range: DateRange) => {
    setDateRangeState(range);
    
    // Save to localStorage with ISO string format for dates
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        startDate: range.startDate.toISOString(),
        endDate: range.endDate.toISOString(),
        preset: selectedPreset
      })
    );
  };

  return (
    <DateContext.Provider
      value={{
        dateRange,
        setDateRange,
        presets,
        selectedPreset,
        setSelectedPreset,
      }}
    >
      {children}
    </DateContext.Provider>
  );
}

export function useDateRange() {
  const context = useContext(DateContext);
  if (!context) {
    throw new Error("useDateRange must be used within a DateProvider");
  }
  return context;
}

export default DateProvider;