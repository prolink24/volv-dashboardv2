import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number with thousands separators
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Formats a number as a currency with $ symbol
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Formats a number as a percentage
 */
export function formatPercent(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 1
  }).format(value / 100);
}

/**
 * Calculates the date range for different period options
 */
export function getDateRangeByOption(option: string): { start: Date; end: Date } {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const now = new Date(today);
  
  switch (option) {
    case 'today':
      return {
        start: new Date(today.setHours(0, 0, 0, 0)),
        end: now
      };
    case 'yesterday':
      return {
        start: yesterday,
        end: new Date(yesterday.setHours(23, 59, 59, 999))
      };
    case 'this-week': {
      const first = today.getDate() - today.getDay();
      const start = new Date(today.setDate(first));
      start.setHours(0, 0, 0, 0);
      return {
        start,
        end: now
      };
    }
    case 'last-week': {
      const first = today.getDate() - today.getDay() - 7;
      const start = new Date(today.setDate(first));
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return {
        start,
        end
      };
    }
    case 'this-month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        start,
        end: now
      };
    }
    case 'last-month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      return {
        start,
        end
      };
    }
    case 'this-quarter': {
      const currentQuarter = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), currentQuarter * 3, 1);
      return {
        start,
        end: now
      };
    }
    case 'last-quarter': {
      const currentQuarter = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), (currentQuarter - 1) * 3, 1);
      const end = new Date(today.getFullYear(), currentQuarter * 3, 0);
      end.setHours(23, 59, 59, 999);
      return {
        start,
        end
      };
    }
    case 'this-year': {
      const start = new Date(today.getFullYear(), 0, 1);
      return {
        start,
        end: now
      };
    }
    case 'last-year': {
      const start = new Date(today.getFullYear() - 1, 0, 1);
      const end = new Date(today.getFullYear(), 0, 0);
      end.setHours(23, 59, 59, 999);
      return {
        start,
        end
      };
    }
    default:
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: now
      };
  }
}