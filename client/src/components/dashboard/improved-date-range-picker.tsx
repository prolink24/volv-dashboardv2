import { useState, useEffect } from "react";
import { useDateRange, dateRangePresets } from "@/hooks/use-date-range";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown, Check, Loader2 } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";

interface ImprovedDateRangePickerProps {
  isLoading?: boolean;
  onApply?: () => void;
  className?: string;
}

export function ImprovedDateRangePicker({
  isLoading = false,
  onApply,
  className
}: ImprovedDateRangePickerProps) {
  const { 
    dateRange, 
    setDateRange, 
    presetKey, 
    setPresetKey 
  } = useDateRange();
  
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState({
    from: dateRange.startDate,
    to: dateRange.endDate,
  });

  // Update internal state when the global date range changes
  useEffect(() => {
    setSelectedRange({
      from: dateRange.startDate,
      to: dateRange.endDate,
    });
  }, [dateRange]);

  // Apply the selected date range
  const handleApply = () => {
    if (selectedRange.from && selectedRange.to) {
      setDateRange({
        startDate: selectedRange.from,
        endDate: selectedRange.to,
      });
      
      // Call the onApply callback if provided
      if (onApply) {
        onApply();
      }
    }
    
    setIsOpen(false);
  };

  // Apply a preset
  const handleSelectPreset = (value: string) => {
    if (dateRangePresets[value]) {
      setPresetKey(value);
      setIsOpen(false);
      
      // Call the onApply callback if provided
      if (onApply) {
        onApply();
      }
    }
  };

  // Format the display text
  const displayText = dateRange.label || 
    `${format(dateRange.startDate, "MMM d, yyyy")} - ${format(dateRange.endDate, "MMM d, yyyy")}`;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={`w-[240px] justify-between ${className}`}
          disabled={isLoading}
        >
          <div className="flex items-center text-left">
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className="truncate">{displayText}</span>
          </div>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronDown className="h-4 w-4 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4 pb-0">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Select Preset</h4>
            <Select 
              value={presetKey || ""} 
              onValueChange={handleSelectPreset}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a preset" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(dateRangePresets).map(([key, preset]) => (
                  <SelectItem key={key} value={key}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4 space-y-2">
            <h4 className="font-medium text-sm">Custom Range</h4>
            <Calendar
              mode="range"
              selected={{
                from: selectedRange.from,
                to: selectedRange.to
              }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  setSelectedRange({
                    from: range.from,
                    to: range.to
                  });
                }
              }}
              numberOfMonths={2}
              defaultMonth={selectedRange.from}
              className="rounded-md border"
            />
          </div>
        </div>
        <Separator className="my-4" />
        <div className="flex items-center justify-between p-4 pt-0">
          <div className="text-sm text-muted-foreground">
            {selectedRange.from && selectedRange.to ? (
              <>
                {format(selectedRange.from, "MMM d, yyyy")} - 
                {format(selectedRange.to, "MMM d, yyyy")}
              </>
            ) : (
              "Please select a date range"
            )}
          </div>
          <Button 
            size="sm" 
            onClick={handleApply}
            disabled={!selectedRange.from || !selectedRange.to}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default ImprovedDateRangePicker;