import React, { useEffect, useState } from "react";
import { addDays, format, isValid } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDateRange } from "@/providers/date-context";
import { cn } from "@/lib/utils";

interface ImprovedDateRangePickerProps {
  isLoading?: boolean;
  onApply?: () => void;
  className?: string;
}

export function ImprovedDateRangePicker({
  isLoading = false,
  onApply,
  className = "",
}: ImprovedDateRangePickerProps) {
  const {
    dateRange,
    setDateRange,
    presets,
    selectedPreset,
    setSelectedPreset,
  } = useDateRange();

  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState<{
    from: Date;
    to: Date | undefined;
  }>({
    from: dateRange.startDate,
    to: dateRange.endDate,
  });

  // Update local state when dateRange changes
  useEffect(() => {
    setDate({
      from: dateRange.startDate,
      to: dateRange.endDate,
    });
  }, [dateRange]);

  // Handle preset selection
  const handleSelectPreset = (preset: string | null) => {
    if (!preset) return;
    setSelectedPreset(preset);
    
    if (preset in presets) {
      const newRange = presets[preset];
      setDateRange(newRange);
      setDate({
        from: newRange.startDate,
        to: newRange.endDate,
      });
    }
  };

  // Handle custom date selection
  const handleCustomDateChange = (selectedDate: { from: Date; to: Date | undefined }) => {
    setDate(selectedDate);
    
    // Only update if we have a complete range
    if (selectedDate.from && selectedDate.to) {
      setSelectedPreset(null); // Custom range
    }
  };

  // Apply button handler
  const handleApply = () => {
    if (date.from && date.to && isValid(date.from) && isValid(date.to)) {
      // Update the date range
      setDateRange({
        startDate: date.from,
        endDate: date.to,
      });
      
      // Close the popover
      setIsOpen(false);
      
      // Call onApply callback if provided
      if (onApply) {
        onApply();
      }
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            size="sm"
            disabled={isLoading}
            className={cn(
              "w-[260px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date.from && date.to ? (
              selectedPreset ? (
                <span>{selectedPreset}</span>
              ) : (
                <span>
                  {format(date.from, "MMM d, yyyy")} -{" "}
                  {format(date.to, "MMM d, yyyy")}
                </span>
              )
            ) : (
              <span>Select date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col sm:flex-row">
            <div className="p-3 border-b sm:border-r sm:border-b-0">
              <Select
                value={selectedPreset || "custom"}
                onValueChange={(value) => handleSelectPreset(value === "custom" ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Range</SelectItem>
                  {Object.keys(presets).map((preset) => (
                    <SelectItem key={preset} value={preset}>
                      {preset}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs text-muted-foreground">Start Date</span>
                    <span className="text-sm font-medium">
                      {date.from ? format(date.from, "MMM d, yyyy") : "Select"}
                    </span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs text-muted-foreground">End Date</span>
                    <span className="text-sm font-medium">
                      {date.to ? format(date.to, "MMM d, yyyy") : "Select"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={handleApply}
                    disabled={!date.from || !date.to}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="p-3">
              <Calendar
                mode="range"
                defaultMonth={date.from}
                selected={{
                  from: date.from,
                  to: date.to,
                }}
                onSelect={handleCustomDateChange}
                numberOfMonths={1}
                disabled={isLoading}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}