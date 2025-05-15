/**
 * useDataRange Hook
 * 
 * This hook provides a global date range state that can be used across the application
 * to consistently filter data based on the selected date range.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addDays, startOfDay, endOfDay, startOfMonth, endOfMonth, 
         startOfYear, endOfYear, subDays, subMonths, subYears } from 'date-fns';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  label?: string;
}

// Available preset date ranges
export const dateRangePresets: { [key: string]: DateRange } = {
  today: {
    startDate: startOfDay(new Date()),
    endDate: endOfDay(new Date()),
    label: 'Today'
  },
  yesterday: {
    startDate: startOfDay(subDays(new Date(), 1)),
    endDate: endOfDay(subDays(new Date(), 1)),
    label: 'Yesterday'
  },
  last7Days: {
    startDate: startOfDay(subDays(new Date(), 6)),
    endDate: endOfDay(new Date()),
    label: 'Last 7 days'
  },
  last30Days: {
    startDate: startOfDay(subDays(new Date(), 29)),
    endDate: endOfDay(new Date()),
    label: 'Last 30 days'
  },
  thisMonth: {
    startDate: startOfMonth(new Date()),
    endDate: endOfDay(new Date()),
    label: 'This month'
  },
  lastMonth: {
    startDate: startOfMonth(subMonths(new Date(), 1)),
    endDate: endOfMonth(subMonths(new Date(), 1)),
    label: 'Last month'
  },
  thisQuarter: {
    startDate: new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3, 1),
    endDate: endOfDay(new Date()),
    label: 'This quarter'
  },
  lastQuarter: {
    startDate: new Date(
      new Date().getMonth() < 3 
        ? new Date().getFullYear() - 1 
        : new Date().getFullYear(), 
      new Date().getMonth() < 3 
        ? 9 
        : (Math.floor(new Date().getMonth() / 3) - 1) * 3, 
      1
    ),
    endDate: new Date(
      new Date().getMonth() < 3 
        ? new Date().getFullYear() - 1 
        : new Date().getFullYear(), 
      new Date().getMonth() < 3 
        ? 11 
        : Math.floor(new Date().getMonth() / 3) * 3 - 1, 
      0
    ),
    label: 'Last quarter'
  },
  thisYear: {
    startDate: startOfYear(new Date()),
    endDate: endOfDay(new Date()),
    label: 'This year'
  },
  lastYear: {
    startDate: startOfYear(subYears(new Date(), 1)),
    endDate: endOfYear(subYears(new Date(), 1)),
    label: 'Last year'
  },
  allTime: {
    startDate: new Date(2023, 0, 1), // Assuming data starts from 2023
    endDate: endOfDay(new Date()),
    label: 'All time'
  }
};

// Define the store interface
interface DateRangeState {
  dateRange: DateRange;
  setDateRange: (dateRange: DateRange) => void;
  presetKey: string | null;
  setPresetKey: (key: string | null) => void;
  formatDateRange: () => string;
}

// Create a persisted Zustand store that saves the date range in localStorage
export const useDateRangeStore = create<DateRangeState>()(
  persist(
    (set, get) => ({
      // Default to "Last 30 days"
      dateRange: dateRangePresets.last30Days,
      setDateRange: (dateRange) => set({ dateRange, presetKey: null }),
      presetKey: 'last30Days',
      setPresetKey: (key) => {
        if (key && dateRangePresets[key]) {
          set({ dateRange: dateRangePresets[key], presetKey: key });
        } else {
          set({ presetKey: null });
        }
      },
      formatDateRange: () => {
        const { dateRange } = get();
        const startDateStr = dateRange.startDate.toLocaleDateString();
        const endDateStr = dateRange.endDate.toLocaleDateString();
        return `${startDateStr} - ${endDateStr}`;
      }
    }),
    {
      name: 'date-range-storage',
      // Custom serialization to handle Date objects
      serialize: (state) => {
        return JSON.stringify({
          ...state,
          state: {
            ...state.state,
            dateRange: {
              ...state.state.dateRange,
              startDate: state.state.dateRange.startDate.toISOString(),
              endDate: state.state.dateRange.endDate.toISOString(),
            },
          },
        });
      },
      // Custom deserialization to handle Date objects
      deserialize: (str) => {
        const parsed = JSON.parse(str);
        return {
          ...parsed,
          state: {
            ...parsed.state,
            dateRange: {
              ...parsed.state.dateRange,
              startDate: new Date(parsed.state.dateRange.startDate),
              endDate: new Date(parsed.state.dateRange.endDate),
            },
          },
        };
      },
    }
  )
);

// Helper function to format a date into "YYYY-MM-DD" string
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper function to format a date range into "YYYY-MM-DD_YYYY-MM-DD" string
// for sending to the API
export function formatDateRangeForApi(dateRange: DateRange): string {
  const startStr = formatDate(dateRange.startDate);
  const endStr = formatDate(dateRange.endDate);
  return `${startStr}_${endStr}`;
}

// Custom hook for using the date range throughout the application
export function useDateRange() {
  const { dateRange, setDateRange, presetKey, setPresetKey, formatDateRange } = useDateRangeStore();
  
  // Function to apply dateRange to API request params
  const applyDateRangeToParams = (params: Record<string, any> = {}): Record<string, any> => {
    return {
      ...params,
      dateRange: formatDateRangeForApi(dateRange),
    };
  };
  
  return {
    dateRange,
    setDateRange,
    presetKey,
    setPresetKey,
    formatDateRange,
    applyDateRangeToParams,
    dateRangePresets,
  };
}