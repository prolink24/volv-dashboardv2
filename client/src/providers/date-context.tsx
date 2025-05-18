import { createContext, useState, useContext, ReactNode } from "react";
import { add, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";

// Define the shape of our date range
export interface DateRange {
  startDate: Date;
  endDate: Date;
  label?: string;
}

// Define date range presets
export const dateRangePresets: Record<string, { label: string; range: () => DateRange }> = {
  "this-month": {
    label: "This Month",
    range: () => ({
      startDate: startOfMonth(new Date()),
      endDate: endOfMonth(new Date()),
      label: "This Month"
    })
  },
  "last-month": {
    label: "Last Month",
    range: () => {
      const date = add(new Date(), { months: -1 });
      return {
        startDate: startOfMonth(date),
        endDate: endOfMonth(date),
        label: "Last Month"
      };
    }
  },
  "this-week": {
    label: "This Week",
    range: () => ({
      startDate: startOfWeek(new Date(), { weekStartsOn: 1 }),
      endDate: endOfWeek(new Date(), { weekStartsOn: 1 }),
      label: "This Week"
    })
  },
  "last-week": {
    label: "Last Week",
    range: () => {
      const date = add(new Date(), { weeks: -1 });
      return {
        startDate: startOfWeek(date, { weekStartsOn: 1 }),
        endDate: endOfWeek(date, { weekStartsOn: 1 }),
        label: "Last Week"
      };
    }
  },
  "last-30-days": {
    label: "Last 30 Days",
    range: () => ({
      startDate: add(new Date(), { days: -30 }),
      endDate: endOfDay(new Date()),
      label: "Last 30 Days"
    })
  },
  "last-90-days": {
    label: "Last 90 Days",
    range: () => ({
      startDate: add(new Date(), { days: -90 }),
      endDate: endOfDay(new Date()),
      label: "Last 90 Days"
    })
  },
  "today": {
    label: "Today",
    range: () => ({
      startDate: startOfDay(new Date()),
      endDate: endOfDay(new Date()),
      label: "Today"
    })
  },
  "yesterday": {
    label: "Yesterday",
    range: () => {
      const yesterday = add(new Date(), { days: -1 });
      return {
        startDate: startOfDay(yesterday),
        endDate: endOfDay(yesterday),
        label: "Yesterday"
      };
    }
  },
  "april-2025": {
    label: "April 2025",
    range: () => {
      // Create a date for April 2025
      const april2025 = new Date(2025, 3, 1); // Month is 0-indexed, so 3 = April
      
      return {
        startDate: startOfMonth(april2025),
        endDate: endOfMonth(april2025),
        label: "April 2025"
      };
    }
  }
};

// Create the context
export interface DateContextProps {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  presetKey: string | null;
  setPresetKey: (key: string) => void;
}

const DateContext = createContext<DateContextProps>({
  dateRange: dateRangePresets["april-2025"].range(),
  setDateRange: () => {},
  presetKey: "april-2025",
  setPresetKey: () => {}
});

// Provider component
interface DateProviderProps {
  children: ReactNode;
  initialPreset?: string;
}

export const DateProvider = ({ 
  children, 
  initialPreset = "april-2025" 
}: DateProviderProps) => {
  const [presetKey, setPresetKey] = useState<string | null>(initialPreset);
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const preset = dateRangePresets[initialPreset];
    return preset ? preset.range() : dateRangePresets["april-2025"].range();
  });

  // Update the date range when preset changes
  const handleSetPresetKey = (key: string) => {
    setPresetKey(key);
    const preset = dateRangePresets[key];
    if (preset) {
      setDateRange(preset.range());
    }
  };

  return (
    <DateContext.Provider
      value={{
        dateRange,
        setDateRange,
        presetKey,
        setPresetKey: handleSetPresetKey
      }}
    >
      {children}
    </DateContext.Provider>
  );
};

// Custom hook to use the date context
export const useDateRange = () => {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error("useDateRange must be used within a DateProvider");
  }
  return context;
};

export default DateProvider;