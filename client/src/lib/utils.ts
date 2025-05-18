import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines and merges class names with Tailwind CSS. This utility helps prevent duplicate
 * class names and handles conditional classes elegantly.
 * @param inputs - Class values or conditional class objects
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as currency (USD)
 * @param value - Number to format
 * @param minimumFractionDigits - Minimum fraction digits to show
 * @param maximumFractionDigits - Maximum fraction digits to show
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number, 
  minimumFractionDigits = 0, 
  maximumFractionDigits = 0
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits,
    maximumFractionDigits
  }).format(value);
}

/**
 * Format a number with thousands separators
 * @param value - Number to format
 * @returns Formatted number string
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Format a percentage
 * @param value - Number to format as percentage 
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Calculate the percent change between two values
 * @param current - Current value
 * @param previous - Previous value
 * @returns Percentage change or null if previous is 0 or null
 */
export function calculatePercentChange(current: number, previous?: number): number | null {
  if (previous === undefined || previous === null || previous === 0) {
    return null;
  }
  
  return ((current - previous) / previous) * 100;
}

/**
 * Truncate a string to a specified length and add ellipsis
 * @param str - String to truncate
 * @param length - Maximum length
 * @returns Truncated string
 */
export function truncateString(str: string, length = 30): string {
  if (!str) return '';
  if (str.length <= length) return str;
  
  return str.substring(0, length) + '...';
}

/**
 * Delays execution for specified milliseconds
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after the specified time
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a debounced function that delays invoking the provided function
 * until after the specified wait time has elapsed since the last invocation.
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T, 
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>): void {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);
  };
}