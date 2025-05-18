import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
  subQuarters,
  subYears,
  format
} from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date into a readable string format
 * @param date Date to format
 * @param formatStr Optional format string (defaults to 'MMM d, yyyy')
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, formatStr: string = 'MMM d, yyyy'): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, formatStr);
  } catch (e) {
    console.error('Error formatting date:', e);
    return '';
  }
}

/**
 * Format a date and time into a readable string format
 * @param date Date to format
 * @param formatStr Optional format string (defaults to 'MMM d, yyyy h:mm a')
 * @returns Formatted date and time string
 */
export function formatDateTime(date: Date | string, formatStr: string = 'MMM d, yyyy h:mm a'): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, formatStr);
  } catch (e) {
    console.error('Error formatting date and time:', e);
    return '';
  }
}

/**
 * Format a number with commas as thousand separators
 */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '0';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Format a number as currency with $ sign and commas
 */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '$0';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0';
  
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
}

/**
 * Format a number as a percentage
 */
export function formatPercent(value: number | string | null | undefined, decimals = 0): string {
  if (value === null || value === undefined) return '0%';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0%';
  
  return new Intl.NumberFormat('en-US', { 
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num / 100);
}

/**
 * Get a date range based on a preset option
 */
export function getDateRangeByOption(option: string) {
  const now = new Date();
  
  switch (option) {
    case 'today':
    case 'today':
      return {
        startDate: startOfDay(now),
        endDate: now,
        label: 'Today'
      };
    case 'yesterday':
      const yesterday = subDays(now, 1);
      return {
        startDate: startOfDay(yesterday),
        endDate: endOfDay(yesterday),
        label: 'Yesterday'
      };
    case 'this_week':
    case 'this-week':
      return {
        startDate: startOfWeek(now, { weekStartsOn: 1 }),
        endDate: now,
        label: 'This Week'
      };
    case 'last_week':
    case 'last-week':
      const lastWeek = subWeeks(now, 1);
      return {
        startDate: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        endDate: endOfWeek(lastWeek, { weekStartsOn: 1 }),
        label: 'Last Week'
      };
    case 'this_month':
    case 'this-month':
      return {
        startDate: startOfMonth(now),
        endDate: now,
        label: 'This Month'
      };
    case 'last_month':
    case 'last-month':
      const lastMonth = subMonths(now, 1);
      return {
        startDate: startOfMonth(lastMonth),
        endDate: endOfMonth(lastMonth),
        label: 'Last Month'
      };
    case 'this_quarter':
    case 'this-quarter':
      return {
        startDate: startOfQuarter(now),
        endDate: now,
        label: 'This Quarter'
      };
    case 'last_quarter':
    case 'last-quarter':
      const lastQuarter = subQuarters(now, 1);
      return {
        startDate: startOfQuarter(lastQuarter),
        endDate: endOfQuarter(lastQuarter),
        label: 'Last Quarter'
      };
    case 'this_year':
    case 'this-year':
      return {
        startDate: startOfYear(now),
        endDate: now,
        label: 'This Year'
      };
    case 'last_year':
    case 'last-year':
      const lastYear = subYears(now, 1);
      return {
        startDate: startOfYear(lastYear),
        endDate: endOfYear(lastYear),
        label: 'Last Year'
      };
    default:
      return {
        startDate: startOfMonth(now),
        endDate: now,
        label: 'This Month'
      };
  }
}

/**
 * Get initials from a name (up to 2 characters)
 * @param name Full name to extract initials from
 * @returns String with initials (1-2 characters)
 */
export function getInitials(name: string): string {
  if (!name) return '';
  
  const parts = name.split(' ').filter(part => part.length > 0);
  
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}