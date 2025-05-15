import { render, act, renderHook } from '@testing-library/react';
import { DateProvider, useDateRange, DateRange } from './date-context';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('DateContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
  });

  it('provides default date range on initial load', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DateProvider>{children}</DateProvider>
    );
    
    const { result } = renderHook(() => useDateRange(), { wrapper });
    
    // Check if we have a valid default date range
    expect(result.current.dateRange).toBeDefined();
    expect(result.current.dateRange.startDate).toBeInstanceOf(Date);
    expect(result.current.dateRange.endDate).toBeInstanceOf(Date);
    expect(result.current.dateRange.label).toBeDefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('updates date range when setDateRange is called', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DateProvider>{children}</DateProvider>
    );
    
    const { result } = renderHook(() => useDateRange(), { wrapper });
    
    const newDateRange: DateRange = {
      startDate: new Date(2025, 0, 1),
      endDate: new Date(2025, 0, 31),
      label: 'January 2025',
    };
    
    act(() => {
      result.current.setDateRange(newDateRange);
    });
    
    // Verify state is updated
    expect(result.current.dateRange).toEqual(newDateRange);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'app_date_range',
      JSON.stringify(newDateRange)
    );
  });

  it('loads saved date range from localStorage', () => {
    const savedRange: DateRange = {
      startDate: new Date(2025, 2, 1),
      endDate: new Date(2025, 2, 31),
      label: 'March 2025',
    };
    
    // Save a date range to localStorage
    mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify({
      ...savedRange,
      startDate: savedRange.startDate.toISOString(),
      endDate: savedRange.endDate.toISOString(),
    }));
    
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DateProvider>{children}</DateProvider>
    );
    
    const { result } = renderHook(() => useDateRange(), { wrapper });
    
    // Verify the saved range was loaded
    expect(result.current.dateRange.label).toBe('March 2025');
    expect(result.current.dateRange.startDate.getMonth()).toBe(2); // March is month 2 (0-indexed)
  });

  it('throws an error when useDateRange is used outside of DateProvider', () => {
    // Suppress error output during the test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      renderHook(() => useDateRange());
    }).toThrow('useDateRange must be used within a DateProvider');
    
    consoleSpy.mockRestore();
  });
});