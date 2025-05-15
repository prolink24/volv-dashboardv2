import { useState } from "react";
import { useDashboard } from "@/providers/dashboard-provider";
import { useDateRange } from "@/providers/date-context";
import { CalendarIcon } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateRangePicker } from "@/components/global/date-range-picker";

const DashboardFilters = () => {
  const { userFilter, setUserFilter } = useDashboard();
  const { dateRange } = useDateRange();
  const [isOpen, setIsOpen] = useState(false);
  
  const userOptions = [
    "All Users",
    "Josh Sweetnam",
    "Mazin Gazar",
    "Bryann Cabral",
    "Bogdan Micov",
    "Harlan Ryder",
  ];

  return (
    <div className="flex items-center gap-3">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-[240px] justify-start text-left font-normal"
            type="button"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange.label || "Select date range"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <DateRangePicker />
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
