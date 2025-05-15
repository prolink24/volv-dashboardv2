import { useState, useEffect } from "react";
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

const DashboardFilters = () => {
  const { dateFilter, setDateFilter, userFilter, setUserFilter } = useDashboard();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Convert the selected date to the format expected by the dashboard context
  const formatSelectedDate = (selectedDate: Date) => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth() + 1;
    const day = selectedDate.getDate();
    const monthName = format(selectedDate, "MMMM");
    // Keep the format with month and year for display, but include the actual day
    return `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day} | ${monthName} ${day}`;
  };
  
  // Set initial date to current month on first load
  useEffect(() => {
    if (isInitialLoad) {
      const now = new Date();
      const formattedDate = formatSelectedDate(now);
      setDateFilter(formattedDate);
      setSelectedDate(now);
      setIsInitialLoad(false);
    }
  }, [isInitialLoad, setDateFilter]);
  
  // Handle date selection
  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      try {
        // Use the actual selected date, not forcing the 1st of the month
        setSelectedDate(newDate);
        const formattedDate = formatSelectedDate(newDate);
        console.log(`Selected date: ${newDate.toISOString()}, formatted: ${formattedDate}`);
        
        // Update the date filter in the dashboard context
        setDateFilter(formattedDate);
        
        // Prevent any form submission that might cause page refresh
        setTimeout(() => {
          console.log(`Date filter updated to: ${formattedDate}`);
        }, 0);
      } catch (error) {
        console.error("Error handling date selection:", error);
      }
    }
  };
  
  const userOptions = [
    "All Users",
    "Josh Sweetnam",
    "Mazin Gazar",
    "Bryann Cabral",
    "Bogdan Micov",
    "Harlan Ryder",
  ];
  
  // Prevent default form submission that causes page refresh
  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-[220px] justify-start text-left font-normal"
            type="button" // Explicitly set button type to prevent form submission
            onClick={handleButtonClick}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, "MMM d, yyyy") : <span>Select date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div onClick={(e) => e.stopPropagation()}>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(newDate) => handleDateSelect(newDate)}
              initialFocus
              fromMonth={new Date(2024, 0)} // Allow selecting any date from Jan 2024
              toMonth={new Date(2025, 11)}  // to Dec 2025
              disableNavigation={false}
            />
          </div>
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
