import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names with Tailwind CSS utility classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency values with $ sign and commas
 */
export function formatCurrency(value: number | string): string {
  // Handle string values
  const numValue = typeof value === 'string' 
    ? parseFloat(value.replace(/[^0-9.-]/g, '')) 
    : value;
  
  // Check for valid numbers
  if (isNaN(numValue) || !isFinite(numValue)) {
    return '$0';
  }

  // Format with $ sign, commas, and 2 decimal places
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numValue);
}

/**
 * Format numbers with commas for thousands separators
 */
export function formatNumber(value: number | string): string {
  // Handle string values
  const numValue = typeof value === 'string' 
    ? parseFloat(value.replace(/[^0-9.-]/g, '')) 
    : value;
  
  // Check for valid numbers
  if (isNaN(numValue) || !isFinite(numValue)) {
    return '0';
  }

  // Format with commas
  return new Intl.NumberFormat('en-US').format(numValue);
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Format a date to readable format: Jan 1, 2025
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

/**
 * Format a date range as a string: Jan 1 - Jan 31, 2025
 */
export function formatDateRange(startDate: Date, endDate: Date): string {
  const start = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(startDate);
  
  const end = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(endDate);
  
  return `${start} - ${end}`;
}

/**
 * Check if two date ranges overlap
 */
export function dateRangesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA <= endB && startB <= endA;
}

/**
 * Truncate text with ellipsis after specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}