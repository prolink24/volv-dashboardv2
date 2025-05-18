import React, { createContext, useContext, useState, useEffect } from 'react';
import { getDateWithTime } from '@/lib/utils';

interface DateRange {
  startDate: Date;
  endDate: Date;
  label?: string;
}

interface DateContextType {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  presetRanges: {
    label: string;
    range: DateRange;
  }[];
  applyDateRange: (range: DateRange) => void;
}

// Create context with default values
const DateContext = createContext<DateContextType>({
  dateRange: {
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
    endDate: new Date(),
  },
  setDateRange: () => {},
  presetRanges: [],
  applyDateRange: () => {},
});

// Custom hook to use the date context
export const useDateRange = () => useContext(DateContext);

interface DateProviderProps {
  children: React.ReactNode;
}

export const DateProvider: React.FC<DateProviderProps> = ({ children }) => {
  // Default to last 30 days
  const [dateRange, setDateRangeState] = useState<DateRange>({
    startDate: getDateWithTime(new Date(new Date().setDate(new Date().getDate() - 30))),
    endDate: getDateWithTime(new Date(), true),
    label: 'Last 30 days',
  });

  // Generate preset date ranges
  const getPresetRanges = () => {
    const today = new Date();
    
    // Last 7 days
    const last7Start = new Date(today);
    last7Start.setDate(today.getDate() - 6);
    
    // Last 14 days
    const last14Start = new Date(today);
    last14Start.setDate(today.getDate() - 13);
    
    // Last 30 days
    const last30Start = new Date(today);
    last30Start.setDate(today.getDate() - 29);
    
    // Last 90 days
    const last90Start = new Date(today);
    last90Start.setDate(today.getDate() - 89);
    
    // This month
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Last month
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    
    // This quarter
    const thisQuarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
    
    // This year
    const thisYearStart = new Date(today.getFullYear(), 0, 1);
    
    // Last year
    const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
    
    return [
      {
        label: 'Last 7 days',
        range: {
          startDate: getDateWithTime(last7Start),
          endDate: getDateWithTime(today, true),
        },
      },
      {
        label: 'Last 14 days',
        range: {
          startDate: getDateWithTime(last14Start),
          endDate: getDateWithTime(today, true),
        },
      },
      {
        label: 'Last 30 days',
        range: {
          startDate: getDateWithTime(last30Start),
          endDate: getDateWithTime(today, true),
        },
      },
      {
        label: 'Last 90 days',
        range: {
          startDate: getDateWithTime(last90Start),
          endDate: getDateWithTime(today, true),
        },
      },
      {
        label: 'This month',
        range: {
          startDate: getDateWithTime(thisMonthStart),
          endDate: getDateWithTime(today, true),
        },
      },
      {
        label: 'Last month',
        range: {
          startDate: getDateWithTime(lastMonthStart),
          endDate: getDateWithTime(lastMonthEnd, true),
        },
      },
      {
        label: 'This quarter',
        range: {
          startDate: getDateWithTime(thisQuarterStart),
          endDate: getDateWithTime(today, true),
        },
      },
      {
        label: 'This year',
        range: {
          startDate: getDateWithTime(thisYearStart),
          endDate: getDateWithTime(today, true),
        },
      },
      {
        label: 'Last year',
        range: {
          startDate: getDateWithTime(lastYearStart),
          endDate: getDateWithTime(lastYearEnd, true),
        },
      },
    ];
  };

  const presetRanges = getPresetRanges();

  // Set date range with applied start/end timestamps
  const setDateRange = (range: DateRange) => {
    // Make sure the start date is at the beginning of the day (00:00:00)
    const formattedStartDate = getDateWithTime(range.startDate);
    
    // Make sure the end date is at the end of the day (23:59:59)
    const formattedEndDate = getDateWithTime(range.endDate, true);
    
    setDateRangeState({
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      label: range.label,
    });
  };

  // Apply a date range and trigger any needed updates
  const applyDateRange = (range: DateRange) => {
    setDateRange(range);
    // Any additional logic for when date range changes can go here
  };

  // Context value
  const value = {
    dateRange,
    setDateRange,
    presetRanges,
    applyDateRange,
  };

  return <DateContext.Provider value={value}>{children}</DateContext.Provider>;
};