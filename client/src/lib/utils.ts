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
  return new Intl.NumberFormat("en-US").format(value);
}

/**
 * Formats a number as a currency with $ symbol
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formats a number as a percentage
 */
export function formatPercent(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

/**
 * Calculates the date range for different period options
 */
export function getDateRangeByOption(option: string): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date();
  const end = new Date();
  
  switch (option) {
    case "today":
      break;
    case "yesterday":
      start.setDate(now.getDate() - 1);
      end.setDate(now.getDate() - 1);
      break;
    case "this-week":
      start.setDate(now.getDate() - now.getDay());
      break;
    case "last-week":
      start.setDate(now.getDate() - now.getDay() - 7);
      end.setDate(now.getDate() - now.getDay() - 1);
      break;
    case "this-month":
      start.setDate(1);
      break;
    case "last-month":
      start.setMonth(now.getMonth() - 1);
      start.setDate(1);
      end.setDate(0);
      break;
    case "this-quarter": {
      const quarter = Math.floor(now.getMonth() / 3);
      start.setMonth(quarter * 3);
      start.setDate(1);
      end.setMonth(quarter * 3 + 3);
      end.setDate(0);
      break;
    }
    case "last-quarter": {
      const quarter = Math.floor(now.getMonth() / 3) - 1;
      const year = quarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
      start.setFullYear(year);
      start.setMonth((quarter < 0 ? 4 : quarter) * 3);
      start.setDate(1);
      end.setFullYear(year);
      end.setMonth((quarter < 0 ? 4 : quarter) * 3 + 3);
      end.setDate(0);
      break;
    }
    case "this-year":
      start.setMonth(0);
      start.setDate(1);
      break;
    case "last-year":
      start.setFullYear(now.getFullYear() - 1);
      start.setMonth(0);
      start.setDate(1);
      end.setFullYear(now.getFullYear() - 1);
      end.setMonth(11);
      end.setDate(31);
      break;
    case "last-7-days":
      start.setDate(now.getDate() - 6);
      break;
    case "last-30-days":
      start.setDate(now.getDate() - 29);
      break;
    case "last-90-days":
      start.setDate(now.getDate() - 89);
      break;
    default:
      // Last 30 days by default
      start.setDate(now.getDate() - 29);
  }
  
  // Reset hours to 00:00:00 for start and 23:59:59 for end
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}