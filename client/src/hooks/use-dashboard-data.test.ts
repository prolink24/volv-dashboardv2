import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDashboardData, usePrefetchDashboardData } from './use-dashboard-data';
import { useDateRange } from '@/providers/date-context';

// Mock the useDateRange hook
jest.mock('@/providers/date-context', () => ({
  useDateRange: jest.fn(),
}));

describe('useDashboardData', () => {
  const mockDateRange = {
    startDate: new Date(2025, 0, 1),
    endDate: new Date(2025, 0, 31),
    label: 'January 2025',
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useDateRange as jest.Mock).mockReturnValue({
      dateRange: mockDateRange,
      isLoading: false,
    });
    
    // Mock fetch for react-query
    global.fetch = jest.fn().mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          salesTeam: [],
          stats: {
            totalContacts: 100,
            totalDeals: 50,
          },
          kpis: {
            meetings: { current: 30, previous: 25, change: 20 },
          }
        }),
      })
    );
  });
  
  it('should use the current date range from context', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
    
    const { result } = renderHook(() => useDashboardData(), { wrapper });
    
    // Verify query key contains the date range
    expect(result.current.queryKey).toContain(mockDateRange.startDate.toISOString());
    expect(result.current.queryKey).toContain(mockDateRange.endDate.toISOString());
  });
  
  it('should disable the query when date context is loading', async () => {
    // Mock loading state
    (useDateRange as jest.Mock).mockReturnValue({
      dateRange: mockDateRange,
      isLoading: true,
    });
    
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
    
    const { result } = renderHook(() => useDashboardData(), { wrapper });
    
    // Verify query is disabled when date context is loading
    expect(result.current.isEnabled).toBe(false);
  });
  
  it('should include userId in the query key when provided', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
    
    const { result } = renderHook(() => useDashboardData('user_123'), { wrapper });
    
    // Verify userId is included in the query key
    expect(result.current.queryKey).toContain('user_123');
  });
});

describe('usePrefetchDashboardData', () => {
  const mockDateRange = {
    startDate: new Date(2025, 0, 1),
    endDate: new Date(2025, 0, 31),
    label: 'January 2025',
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useDateRange as jest.Mock).mockReturnValue({
      dateRange: mockDateRange,
    });
  });
  
  it('should prefetch dashboard data with the current date range', () => {
    const mockQueryClient = {
      prefetchQuery: jest.fn(),
    };
    
    renderHook(() => usePrefetchDashboardData(mockQueryClient));
    
    // Verify prefetchQuery was called with correct args
    expect(mockQueryClient.prefetchQuery).toHaveBeenCalledTimes(1);
    const prefetchArgs = mockQueryClient.prefetchQuery.mock.calls[0][0];
    expect(prefetchArgs.queryKey).toContain('/api/enhanced-dashboard');
    expect(prefetchArgs.queryKey).toContain(mockDateRange.startDate.toISOString());
    expect(prefetchArgs.queryKey).toContain(mockDateRange.endDate.toISOString());
    expect(prefetchArgs.queryKey).toContain('all');
  });
});