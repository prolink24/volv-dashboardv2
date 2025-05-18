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
  subYears
} from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number with commas as thousand separators
 */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "0";
  
  const num = typeof value === "string" ? parseFloat(value) : value;
  
  // Handle NaN
  if (isNaN(num)) return "0";
  
  // Format with commas
  return num.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/**
 * Format a number as currency with $ sign and commas
 */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "$0";
  
  const num = typeof value === "string" ? parseFloat(value) : value;
  
  // Handle NaN
  if (isNaN(num)) return "$0";
  
  // Format as currency
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(num);
}

/**
 * Format a number as a percentage
 */
export function formatPercent(value: number | string | null | undefined, decimals = 0): string {
  if (value === null || value === undefined) return "0%";
  
  const num = typeof value === "string" ? parseFloat(value) : value;
  
  // Handle NaN
  if (isNaN(num)) return "0%";
  
  // Format as percentage
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num / 100);
}

/**
 * Get a date range based on a preset option
 */
export function getDateRangeByOption(option: string) {
  const today = new Date();
  
  switch (option) {
    case "today":
      return {
        start: startOfDay(today),
        end: endOfDay(today)
      };
      
    case "yesterday":
      const yesterday = subDays(today, 1);
      return {
        start: startOfDay(yesterday),
        end: endOfDay(yesterday)
      };
      
    case "this-week":
      return {
        start: startOfWeek(today, { weekStartsOn: 1 }),
        end: endOfWeek(today, { weekStartsOn: 1 })
      };
      
    case "last-week":
      const lastWeek = subWeeks(today, 1);
      return {
        start: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        end: endOfWeek(lastWeek, { weekStartsOn: 1 })
      };
      
    case "this-month":
      return {
        start: startOfMonth(today),
        end: endOfMonth(today)
      };
      
    case "last-month":
      const lastMonth = subMonths(today, 1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth)
      };
      
    case "this-quarter":
      return {
        start: startOfQuarter(today),
        end: endOfQuarter(today)
      };
      
    case "last-quarter":
      const lastQuarter = subQuarters(today, 1);
      return {
        start: startOfQuarter(lastQuarter),
        end: endOfQuarter(lastQuarter)
      };
      
    case "this-year":
      return {
        start: startOfYear(today),
        end: endOfYear(today)
      };
      
    case "last-year":
      const lastYear = subYears(today, 1);
      return {
        start: startOfYear(lastYear),
        end: endOfYear(lastYear)
      };
      
    default:
      // Default to this month
      return {
        start: startOfMonth(today),
        end: endOfMonth(today)
      };
  }
}