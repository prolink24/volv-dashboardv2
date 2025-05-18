import React, { createContext, useContext, useState } from 'react';
import { addDays, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';

// Define the date range interface
export interface DateRange {
  startDate: Date;
  endDate: Date;
  label?: string;
}

// Define the preset date ranges
const getPresetRanges = () => [
  {
    label: 'Today',
    range: {
      startDate: startOfDay(new Date()),
      endDate: endOfDay(new Date()),
    },
  },
  {
    label: 'Yesterday',
    range: {
      startDate: startOfDay(addDays(new Date(), -1)),
      endDate: endOfDay(addDays(new Date(), -1)),
    },
  },
  {
    label: 'This Week',
    range: {
      startDate: startOfWeek(new Date(), { weekStartsOn: 1 }),
      endDate: endOfWeek(new Date(), { weekStartsOn: 1 }),
    },
  },
  {
    label: 'Last Week',
    range: {
      startDate: startOfWeek(addDays(new Date(), -7), { weekStartsOn: 1 }),
      endDate: endOfWeek(addDays(new Date(), -7), { weekStartsOn: 1 }),
    },
  },
  {
    label: 'This Month',
    range: {
      startDate: startOfMonth(new Date()),
      endDate: endOfMonth(new Date()),
    },
  },
  {
    label: 'Last Month',
    range: {
      startDate: startOfMonth(addMonths(new Date(), -1)),
      endDate: endOfMonth(addMonths(new Date(), -1)),
    },
  },
  {
    label: 'Last 3 Months',
    range: {
      startDate: startOfMonth(addMonths(new Date(), -3)),
      endDate: endOfMonth(new Date()),
    },
  },
  {
    label: 'Year to Date',
    range: {
      startDate: new Date(new Date().getFullYear(), 0, 1), // January 1st of current year
      endDate: endOfDay(new Date()),
    },
  },
];

// Define the context type
interface DateContextType {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  presetRanges: {
    label: string;
    range: DateRange;
  }[];
  applyDateRange: (range: DateRange) => void;
  selectedPreset: string | null;
  setSelectedPreset: (preset: string | null) => void;
}

// Create the context with default values
const DateContext = createContext<DateContextType>({
  dateRange: {
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
  },
  setDateRange: () => {},
  presetRanges: getPresetRanges(),
  applyDateRange: () => {},
  selectedPreset: null,
  setSelectedPreset: () => {},
});

// Create a hook to use the date context
export const useDateRange = () => useContext(DateContext);

// Props interface for the DateProvider
interface DateProviderProps {
  children: React.ReactNode;
}

// Create the DateProvider component
export const DateProvider: React.FC<DateProviderProps> = ({ children }) => {
  // Initialize with current month
  const [dateRange, setDateRangeState] = useState<DateRange>({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    label: 'This Month',
  });
  
  const [selectedPreset, setSelectedPreset] = useState<string | null>('This Month');
  const presetRanges = getPresetRanges();
  
  // Function to set the date range
  const setDateRange = (range: DateRange) => {
    setDateRangeState(range);
  };
  
  // Function to apply date range and possibly update the selected preset
  const applyDateRange = (range: DateRange) => {
    setDateRangeState(range);
    
    // If a label is provided, use it as the selected preset
    if (range.label) {
      setSelectedPreset(range.label);
    }
    // Otherwise, check if the range matches a preset
    else {
      const matchingPreset = presetRanges.find(
        (preset) =>
          preset.range.startDate.getTime() === range.startDate.getTime() &&
          preset.range.endDate.getTime() === range.endDate.getTime()
      );
      
      setSelectedPreset(matchingPreset?.label || null);
    }
  };
  
  // Create the context value
  const contextValue: DateContextType = {
    dateRange,
    setDateRange,
    presetRanges,
    applyDateRange,
    selectedPreset,
    setSelectedPreset,
  };
  
  return (
    <DateContext.Provider value={contextValue}>
      {children}
    </DateContext.Provider>
  );
};