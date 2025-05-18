import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class names into a single string
 * Combines the functionality of clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number with commas for thousands separators
 */
export function formatNumber(value: number): string {
  if (isNaN(value)) return "0";
  return new Intl.NumberFormat().format(Math.round(value));
}

/**
 * Format a currency value with $ sign and commas
 */
export function formatCurrency(value: number): string {
  if (isNaN(value)) return "$0";
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Format a percentage value with % sign
 */
export function formatPercent(value: number): string {
  if (isNaN(value)) return "0%";
  return `${Math.round(value)}%`;
}

/**
 * Get the initials of a name (up to 2 characters)
 */
export function getInitials(name: string): string {
  if (!name) return "?";
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Truncate text with ellipsis if it exceeds maxLength
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}