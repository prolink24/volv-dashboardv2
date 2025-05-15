import { useEffect } from 'react';
import { addDays, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * DateRange type definition
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
  label?: string;
}

/**
 * Predefined date range presets
 */
export const dateRangePresets: { [key: string]: DateRange } = {
  today: {
    startDate: new Date(),
    endDate: new Date(),
    label: 'Today'
  },
  yesterday: {
    startDate: subDays(new Date(), 1),
    endDate: subDays(new Date(), 1),
    label: 'Yesterday'
  },
  last7Days: {
    startDate: subDays(new Date(), 6),
    endDate: new Date(),
    label: 'Last 7 days'
  },
  last14Days: {
    startDate: subDays(new Date(), 13),
    endDate: new Date(),
    label: 'Last 14 days'
  },
  last30Days: {
    startDate: subDays(new Date(), 29),
    endDate: new Date(),
    label: 'Last 30 days'
  },
  last90Days: {
    startDate: subDays(new Date(), 89),
    endDate: new Date(),
    label: 'Last 90 days'
  },
  thisMonth: {
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    label: 'This month'
  },
  lastMonth: {
    startDate: startOfMonth(subDays(new Date(), 30)),
    endDate: endOfMonth(subDays(new Date(), 30)),
    label: 'Last month'
  },
  thisYear: {
    startDate: startOfYear(new Date()),
    endDate: endOfYear(new Date()),
    label: 'This year'
  },
  lastYear: {
    startDate: startOfYear(subDays(new Date(), 365)),
    endDate: endOfYear(subDays(new Date(), 365)),
    label: 'Last year'
  },
  allTime: {
    startDate: new Date(2020, 0, 1), // Default earliest data
    endDate: new Date(),
    label: 'All time'
  }
};

/**
 * DateRangeState interface for the store
 */
interface DateRangeState {
  dateRange: DateRange;
  setDateRange: (dateRange: DateRange) => void;
  presetKey: string | null;
  setPresetKey: (key: string | null) => void;
  formatDateRange: () => string;
  applyDateRangeToParams: (params?: Record<string, any>) => Record<string, any>;
  dateRangePresets: typeof dateRangePresets;
}

/**
 * Zustand store for global date range state
 */
export const useDateRangeStore = create<DateRangeState>()(
  persist(
    (set, get) => ({
      dateRange: dateRangePresets.last30Days,
      presetKey: 'last30Days',
      setDateRange: (dateRange) => set({ dateRange, presetKey: null }),
      setPresetKey: (key) => {
        if (key && dateRangePresets[key]) {
          set({ presetKey: key, dateRange: dateRangePresets[key] });
        } else {
          set({ presetKey: null });
        }
      },
      formatDateRange: () => {
        const state = get();
        if (state.presetKey && dateRangePresets[state.presetKey]) {
          return dateRangePresets[state.presetKey].label || '';
        }
        const { startDate, endDate } = state.dateRange;
        return `${formatDate(startDate)} - ${formatDate(endDate)}`;
      },
      applyDateRangeToParams: (params = {}) => {
        const { dateRange } = get();
        return {
          ...params,
          dateRange: formatDateRangeForApi(dateRange),
        };
      },
      dateRangePresets
    }),
    {
      name: 'contact-attribution-date-range',
      partialize: (state) => ({
        dateRange: { 
          startDate: state.dateRange.startDate.toISOString(),
          endDate: state.dateRange.endDate.toISOString()
        },
        presetKey: state.presetKey
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert ISO strings back to Date objects
          if (typeof state.dateRange.startDate === 'string') {
            state.dateRange.startDate = new Date(state.dateRange.startDate);
          }
          if (typeof state.dateRange.endDate === 'string') {
            state.dateRange.endDate = new Date(state.dateRange.endDate);
          }
        }
      }
    }
  )
);

/**
 * Helper function to format a date
 */
export function formatDate(date: Date): string {
  return format(date, 'MMM d, yyyy');
}

/**
 * Format date range for API requests in YYYY-MM-DD_YYYY-MM-DD format
 */
export function formatDateRangeForApi(dateRange: DateRange): string {
  const startFormatted = format(dateRange.startDate, 'yyyy-MM-dd');
  const endFormatted = format(dateRange.endDate, 'yyyy-MM-dd'); 
  return `${startFormatted}_${endFormatted}`;
}

/**
 * Custom hook for accessing date range state with additional logic
 */
export function useDateRange() {
  const dateRangeState = useDateRangeStore();

  // Update presetKey if dateRange matches a preset
  useEffect(() => {
    if (dateRangeState.presetKey === null) {
      const { dateRange } = dateRangeState;
      const startStr = format(dateRange.startDate, 'yyyy-MM-dd');
      const endStr = format(dateRange.endDate, 'yyyy-MM-dd');

      // Check if current date range matches any preset
      for (const [key, preset] of Object.entries(dateRangePresets)) {
        const presetStartStr = format(preset.startDate, 'yyyy-MM-dd');
        const presetEndStr = format(preset.endDate, 'yyyy-MM-dd');
        
        if (startStr === presetStartStr && endStr === presetEndStr) {
          dateRangeState.setPresetKey(key);
          break;
        }
      }
    }
  }, [dateRangeState.dateRange, dateRangeState.presetKey]);

  return dateRangeState;
}