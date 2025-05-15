import { useState, useEffect, useCallback } from "react";
import { useDashboard } from "@/providers/dashboard-provider";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { queryClient } from "@/lib/queryClient";

const DashboardFilters = () => {
  const { dateFilter, setDateFilter, userFilter, setUserFilter } = useDashboard();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  // Format the date for display in the button
  const formatDateForDisplay = (date: Date): string => {
    return format(date, "MMM d, yyyy");
  };
  
  // Format the date for the filter string
  const formatDateForFilter = (date: Date): string => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const monthName = format(date, "MMMM");
    return `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day} | ${monthName} ${day}`;
  };
  
  // Parse a date from the filter string
  const parseDateFromFilter = (filterString: string): Date => {
    try {
      const datePart = filterString.split('|')[0].trim();
      const parts = datePart.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);
        return new Date(year, month, day);
      }
    } catch (e) {
      console.error("Error parsing date from filter string:", e);
    }
    return new Date();
  };
  
  // Initial load effect
  useEffect(() => {
    console.log("[DashboardFilters] Initial load effect running");
    // Set initial selected date from dateFilter if it exists
    if (dateFilter) {
      console.log(`[DashboardFilters] Setting initial date from filter: ${dateFilter}`);
      try {
        const date = parseDateFromFilter(dateFilter);
        setSelectedDate(date);
        console.log(`[DashboardFilters] Parsed date: ${date.toISOString()}`);
      } catch (error) {
        console.error("[DashboardFilters] Error parsing initial date:", error);
      }
    } else {
      // If no dateFilter, use current date
      const now = new Date();
      setSelectedDate(now);
      // Set the initial filter value
      const formattedDate = formatDateForFilter(now);
      console.log(`[DashboardFilters] Setting initial filter to current date: ${formattedDate}`);
      setDateFilter(formattedDate);
    }
  }, []);
  
  // Handle date selection from the calendar
  const handleDateSelect = useCallback((date: Date | undefined) => {
    console.log(`[DashboardFilters] Date selected: ${date?.toISOString()}`);
    if (!date) return;
    
    // Update the local state
    setSelectedDate(date);
    
    // Format the date for the filter
    const formattedDate = formatDateForFilter(date);
    console.log(`[DashboardFilters] Formatted date for filter: ${formattedDate}`);
    
    // Update the filter in the context
    setDateFilter(formattedDate);
    
    // Close the popover
    setIsOpen(false);
    
    // Force query invalidation to refresh data
    console.log(`[DashboardFilters] Invalidating queries with date ${date.toISOString()}`);
    queryClient.invalidateQueries({
      predicate: (query) => {
        // Invalidate any dashboard-related queries
        const queryKey = Array.isArray(query.queryKey) ? query.queryKey[0] : query.queryKey;
        const shouldInvalidate = 
          typeof queryKey === 'string' &&
          (queryKey.includes('/dashboard') || queryKey.includes('/enhanced-dashboard'));
        
        if (shouldInvalidate) {
          console.log(`[DashboardFilters] Invalidating query: ${queryKey}`);
        }
        return shouldInvalidate;
      }
    });
  }, [setDateFilter]);
  
  const userOptions = [
    "All Users",
    "Josh Sweetnam",
    "Mazin Gazar",
    "Bryann Cabral",
    "Bogdan Micov",
    "Harlan Ryder",
  ];

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-[220px] justify-start text-left font-normal"
            type="button"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? formatDateForDisplay(selectedDate) : <span>Select date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            fromMonth={new Date(2024, 0)}
            toMonth={new Date(2025, 11)}
          />
        </PopoverContent>
      </Popover>
      
      <Select value={userFilter} onValueChange={setUserFilter}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select user" />
        </SelectTrigger>
        <SelectContent>
          {userOptions.map((user) => (
            <SelectItem key={user} value={user}>
              {user}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default DashboardFilters;
