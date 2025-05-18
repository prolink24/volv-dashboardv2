/**
 * Utility functions for the dashboard
 */

// Utility for merging Tailwind CSS classes conditionally
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Format currency values (handles string or number input)
export function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '$0';
  
  const numericValue = typeof value === 'string' 
    ? parseFloat(value.replace(/[^0-9.-]+/g, '')) 
    : value;
    
  if (isNaN(numericValue)) return '$0';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(numericValue);
}

// Format percentages (handles string or number input)
export function formatPercentage(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '0%';
  
  const numericValue = typeof value === 'string' 
    ? parseFloat(value.replace(/[^0-9.-]+/g, '')) 
    : value;
    
  if (isNaN(numericValue)) return '0%';
  
  return `${(numericValue * 100).toFixed(1)}%`;
}

// Calculate percentage change between two numbers
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

// Format a date to a human-readable string
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Get a date range label (e.g. "Last 30 days")
export function getDateRangeLabel(startDate: Date, endDate: Date): string {
  const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (days === 6) return 'Last 7 days';
  if (days === 13) return 'Last 14 days';
  if (days === 29) return 'Last 30 days';
  if (days === 89) return 'Last 90 days';
  
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  return `${start} - ${end}`;
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
}

// Get the trend direction (up, down, or neutral)
export function getTrendDirection(value: number): 'up' | 'down' | 'neutral' {
  if (value > 0) return 'up';
  if (value < 0) return 'down';
  return 'neutral';
}

// Safely parse numeric values from database
export function safeParseInt(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  
  const parsed = typeof value === 'string' 
    ? parseInt(value.replace(/[^0-9.-]+/g, '')) 
    : Math.round(value);
    
  return isNaN(parsed) ? 0 : parsed;
}

export function safeParseFloat(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  
  const parsed = typeof value === 'string' 
    ? parseFloat(value.replace(/[^0-9.-]+/g, '')) 
    : value;
    
  return isNaN(parsed) ? 0 : parsed;
}

// Create a date object with the time set to the start or end of the day
export function getDateWithTime(date: Date, isEndOfDay: boolean = false): Date {
  const newDate = new Date(date);
  if (isEndOfDay) {
    newDate.setHours(23, 59, 59, 999);
  } else {
    newDate.setHours(0, 0, 0, 0);
  }
  return newDate;
}

// Format a number with abbreviations (K, M, B)
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '0';
  
  const numericValue = typeof value === 'string' 
    ? parseFloat(value.replace(/[^0-9.-]+/g, '')) 
    : value;
    
  if (isNaN(numericValue)) return '0';
  
  if (numericValue >= 1000000000) {
    return `${(numericValue / 1000000000).toFixed(1)}B`;
  }
  
  if (numericValue >= 1000000) {
    return `${(numericValue / 1000000).toFixed(1)}M`;
  }
  
  if (numericValue >= 1000) {
    return `${(numericValue / 1000).toFixed(1)}K`;
  }
  
  return numericValue.toString();
}