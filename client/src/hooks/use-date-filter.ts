import { useState } from "react";
import { parseMonthYear, formatMonthYear } from "@/lib/utils";

export function useDateFilter(initialDate?: string) {
  // Default to current month if no date provided
  const now = new Date();
  const defaultYear = now.getFullYear();
  const defaultMonth = now.getMonth();
  
  // If initialDate is provided in format "YYYY-MM | Month", parse it
  const initialParsed = initialDate ? parseMonthYear(initialDate) : { year: defaultYear, month: defaultMonth };
  
  const [dateFilter, setDateFilter] = useState(formatMonthYear(initialParsed.year, initialParsed.month));
  
  // Get previous month
  const getPreviousMonth = () => {
    const { year, month } = parseMonthYear(dateFilter);
    let newMonth = month - 1;
    let newYear = year;
    
    if (newMonth < 0) {
      newMonth = 11; // December
      newYear -= 1;
    }
    
    setDateFilter(formatMonthYear(newYear, newMonth));
  };
  
  // Get next month
  const getNextMonth = () => {
    const { year, month } = parseMonthYear(dateFilter);
    let newMonth = month + 1;
    let newYear = year;
    
    if (newMonth > 11) {
      newMonth = 0; // January
      newYear += 1;
    }
    
    setDateFilter(formatMonthYear(newYear, newMonth));
  };
  
  // Get date object for API requests
  const getDateObject = () => {
    const { year, month } = parseMonthYear(dateFilter);
    return new Date(year, month, 1);
  };
  
  return {
    dateFilter,
    setDateFilter,
    getPreviousMonth,
    getNextMonth,
    getDateObject,
  };
}
