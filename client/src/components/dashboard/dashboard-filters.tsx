import { useState, useEffect } from "react";
import { useDashboard } from "@/providers/dashboard-provider";
import { useDateRange } from "@/providers/date-context";
import { CalendarIcon, UserIcon, FilterIcon } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DateRangePicker } from "@/components/global/date-range-picker";

const DashboardFilters = () => {
  const { userFilter, setUserFilter, activeTab } = useDashboard();
  const { dateRange, refreshData, isLoading } = useDateRange();
  const [isOpen, setIsOpen] = useState(false);
  const [filtersApplied, setFiltersApplied] = useState(false);
  
  // Real user data from your CRM system
  // Note: This should ideally come from an API call to get actual users
  const userOptions = [
    "All Users",
    "Josh Sweetnam",
    "Mazin Gazar",
    "Bryann Cabral",
    "Bogdan Micov",
    "Harlan Ryder",
  ];

  // Detect when filters change to show visual indicator
  useEffect(() => {
    // Check if non-default filters are applied
    const hasUserFilter = userFilter !== "All Users";
    const hasDateFilter = dateRange.label !== "Last 30 days"; // Assuming default
    
    setFiltersApplied(hasUserFilter || hasDateFilter);
    
    // Log applied filters for debugging
    if (hasUserFilter || hasDateFilter) {
      console.log("[Filters] Applied filters:", {
        user: userFilter,
        dateRange: dateRange.label,
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString()
      });
    }
  }, [userFilter, dateRange]);

  // Handle applying filters
  const handleApplyFilters = () => {
    console.log("[Filters] Manually refreshing data with current filters");
    refreshData();
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <DateRangePicker />
      
      <div className="flex items-center gap-2">
        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="w-[180px]">
            <UserIcon className="mr-2 h-4 w-4" />
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
        
        <Button 
          variant={filtersApplied ? "default" : "outline"} 
          size="sm"
          className="flex items-center gap-1"
          onClick={handleApplyFilters}
          disabled={isLoading}
        >
          <FilterIcon className="h-4 w-4" />
          <span>Apply</span>
          {filtersApplied && (
            <Badge variant="outline" className="ml-1 bg-primary/20">
              Active
            </Badge>
          )}
        </Button>
      </div>
    </div>
  );
};

export default DashboardFilters;
