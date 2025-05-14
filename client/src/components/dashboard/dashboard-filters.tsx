import { useState, useEffect } from "react";
import { useDashboard } from "@/providers/dashboard-provider";
import { format, setDate } from "date-fns";
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
import { type DayPickerSingleProps } from "react-day-picker";

const DashboardFilters = () => {
  const { dateFilter, setDateFilter, userFilter, setUserFilter } = useDashboard();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Convert the selected date to the format expected by the dashboard context
  const formatSelectedDate = (selectedDate: Date) => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth() + 1;
    const monthName = format(selectedDate, "MMMM");
    return `${year}-${month < 10 ? '0' + month : month} | ${monthName}`;
  };
  
  // Set initial date to current month on first load
  useEffect(() => {
    if (isInitialLoad) {
      const now = new Date();
      const formattedDate = formatSelectedDate(now);
      setDateFilter(formattedDate);
      setDate(now);
      setIsInitialLoad(false);
    }
  }, [isInitialLoad, setDateFilter]);
  
  // Handle date selection
  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
      const formattedDate = formatSelectedDate(newDate);
      setDateFilter(formattedDate);
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
  
  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "MMMM yyyy") : <span>Select month</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(newDate) => handleDateSelect(newDate)}
            initialFocus
            disabled={(date) => {
              // Only enable selection by month (first day of each month)
              return date.getDate() !== 1;
            }}
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
