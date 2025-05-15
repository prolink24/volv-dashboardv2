import { render, screen, fireEvent, act } from '@testing-library/react';
import { DateRangePicker } from './date-range-picker';
import { DateProvider, DateRange, useDateRange } from '@/providers/date-context';
import { format } from 'date-fns';

// Mock the date-context hooks
jest.mock('@/providers/date-context', () => {
  const originalModule = jest.requireActual('@/providers/date-context');
  return {
    ...originalModule,
    useDateRange: jest.fn(),
  };
});

describe('DateRangePicker', () => {
  // Mock implementation for useDateRange
  const mockSetDateRange = jest.fn();
  const defaultDateRange: DateRange = {
    startDate: new Date(2025, 0, 1),
    endDate: new Date(2025, 0, 31),
    label: 'January 2025',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useDateRange as jest.Mock).mockReturnValue({
      dateRange: defaultDateRange,
      setDateRange: mockSetDateRange,
      isLoading: false,
    });
  });

  it('displays the current date range label', () => {
    render(
      <DateProvider>
        <DateRangePicker />
      </DateProvider>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('January 2025');
  });

  it('opens the popover when clicked', () => {
    render(
      <DateProvider>
        <DateRangePicker />
      </DateProvider>
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // Check if popover content is visible
    expect(screen.getByText('Select Range')).toBeInTheDocument();
    expect(screen.getByText('Select preset')).toBeInTheDocument();
  });

  it('applies a preset when selected', () => {
    render(
      <DateProvider>
        <DateRangePicker />
      </DateProvider>
    );
    
    // Open the popover
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // Find and click the select trigger
    const selectTrigger = screen.getByText('Select preset');
    fireEvent.click(selectTrigger);
    
    // Select "Today" preset
    const todayOption = screen.getByText('Today');
    fireEvent.click(todayOption);
    
    // Check if setDateRange was called with appropriate args
    expect(mockSetDateRange).toHaveBeenCalledTimes(1);
    const callArg = mockSetDateRange.mock.calls[0][0];
    expect(callArg.label).toBe('Today');
    expect(callArg.preset).toBe('Today');
    expect(callArg.startDate).toBeInstanceOf(Date);
    expect(callArg.endDate).toBeInstanceOf(Date);
  });

  it('shows a loading indicator when isLoading is true', () => {
    // Mock loading state
    (useDateRange as jest.Mock).mockReturnValue({
      dateRange: defaultDateRange,
      setDateRange: mockSetDateRange,
      isLoading: true,
    });
    
    render(
      <DateProvider>
        <DateRangePicker />
      </DateProvider>
    );
    
    // Check for the presence of the loading indicator (the pulse element)
    const pulseElement = document.querySelector('.animate-pulse');
    expect(pulseElement).toBeInTheDocument();
  });
});