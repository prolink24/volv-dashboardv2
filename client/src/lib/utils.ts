import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names with Tailwind's utilities and clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format number as currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format number as percentage
 */
export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value / 100);
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

/**
 * Generate a random color based on string (for consistent avatar colors)
 */
export function stringToColor(string: string): string {
  let hash = 0;
  let i;

  for (i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = '#';

  for (i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }

  return color;
}

/**
 * Get contrast color (black or white) based on background color
 */
export function getContrastColor(hexColor: string): string {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black or white based on luminance
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Format date to readable format
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

/**
 * Format datetime to readable format
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  }).format(date);
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

/**
 * Convert RGB or RGBA string to object
 */
export function parseRGB(rgb: string): { r: number; g: number; b: number; a?: number } {
  // Remove spaces and split by commas
  const values = rgb
    .replace(/rgba?\(|\)/g, '')
    .split(',')
    .map(val => parseFloat(val.trim()));
  
  // Return object with r, g, b, and a (if available)
  return {
    r: values[0],
    g: values[1],
    b: values[2],
    ...(values.length > 3 ? { a: values[3] } : {})
  };
}

/**
 * Get current month and year string (e.g., "March 2025")
 */
export function getCurrentMonthYear(): string {
  const now = new Date();
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long'
  }).format(now);
}

/**
 * Parse month and year from string (e.g., "2025-03 | March")
 */
export function parseMonthYear(monthYear: string): { year: number; month: number } {
  const [dateStr] = monthYear.split('|');
  const [year, month] = dateStr.trim().split('-').map(Number);
  return { year, month: month - 1 }; // JS months are 0-indexed
}

/**
 * Format month and year (e.g., "2025-03 | March")
 */
export function formatMonthYear(year: number, month: number): string {
  const date = new Date(year, month);
  return `${year}-${String(month + 1).padStart(2, '0')} | ${new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date)}`;
}
