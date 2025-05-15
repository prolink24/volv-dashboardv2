import { useState, useCallback, useEffect, useMemo } from "react";
import { format, isEqual, addDays, subDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger,
  Button, 
  Calendar, 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui";
import { useDateRange, DateRange } from "@/providers/date-context";

/**
 * Date range presets for quick selection
 */
const presets = [
  { 
    label: "Today", 
    getValue: () => {
      const today = new Date();
      return { startDate: today, endDate: today };
    }
  },
  { 
    label: "Yesterday", 
    getValue: () => {
      const yesterday = subDays(new Date(), 1);
      return { startDate: yesterday, endDate: yesterday };
    }
  },
  { 
    label: "Last 7 days", 
    getValue: () => ({
      startDate: subDays(new Date(), 6),
      endDate: new Date(),
    })
  },
  { 
    label: "Last 30 days", 
    getValue: () => ({
      startDate: subDays(new Date(), 29),
      endDate: new Date(),
    })
  },
  { 
    label: "This month", 
    getValue: () => {
      const now = new Date();
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now),
      };
    }
  },
  { 
    label: "Last month", 
    getValue: () => {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
      return {
        startDate: startOfMonth(lastMonth),
        endDate: endOfMonth(lastMonth),
      };
    }
  },
  { 
    label: "This quarter", 
    getValue: () => {
      const now = new Date();
      return {
        startDate: startOfQuarter(now),
        endDate: endOfQuarter(now),
      };
    }
  }
];

/**
 * DateRangePicker component for selecting date ranges with presets
 */
export function DateRangePicker() {
  const { dateRange, setDateRange, isLoading } = useDateRange();
  const [isOpen, setIsOpen] = useState(false);
  
  // Local state for date selection
  const [selectedRange, setSelectedRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: dateRange.startDate,
    to: dateRange.endDate
  });
  
  // Reset local state when global date range changes
  useEffect(() => {
    console.log("[DateRangePicker] Global date range changed, updating local state");
    setSelectedRange({
      from: dateRange.startDate,
      to: dateRange.endDate
    });
  }, [dateRange]);
  
  // Apply the selected date range
  const applyDateRange = useCallback(() => {
    if (selectedRange.from) {
      const start = selectedRange.from;
      const end = selectedRange.to || selectedRange.from;
      
      // Format the label
      let label = '';
      if (isEqual(start, end)) {
        label = format(start, 'MMM d, yyyy');
      } else {
        const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
        if (sameMonth) {
          label = `${format(start, 'MMM d')} - ${format(end, 'd')}, ${format(end, 'yyyy')}`;
        } else {
          label = `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
        }
      }
      
      console.log("[DateRangePicker] Applying date range:", { start, end, label });
      
      // Update global state
      setDateRange({
        startDate: start,
        endDate: end,
        label
      });
      
      // Close the popover
      setIsOpen(false);
    }
  }, [selectedRange, setDateRange]);
  
  // Apply preset date range
  const applyPreset = useCallback((preset: string) => {
    const selectedPreset = presets.find(p => p.label === preset);
    
    if (selectedPreset) {
      const { startDate, endDate } = selectedPreset.getValue();
      
      console.log("[DateRangePicker] Applying preset:", selectedPreset.label, { startDate, endDate });
      
      setSelectedRange({
        from: startDate,
        to: endDate
      });
      
      setDateRange({
        startDate,
        endDate,
        label: selectedPreset.label,
        preset: selectedPreset.label
      });
      
      setIsOpen(false);
    }
  }, [setDateRange]);
  
  // Memoize displayed date to prevent unnecessary re-renders
  const displayedDate = useMemo(() => {
    return dateRange.label;
  }, [dateRange.label]);
  
  return (
    <div className="relative">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-[260px] justify-start text-left font-normal flex items-center"
            type="button"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className="flex-1">{displayedDate}</span>
            {isLoading && (
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-4 border-b">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Select Range</h4>
              <Select 
                onValueChange={applyPreset}
                defaultValue={dateRange.preset}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select preset" />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((preset) => (
                    <SelectItem key={preset.label} value={preset.label}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Calendar
            mode="range"
            selected={{
              from: selectedRange.from,
              to: selectedRange.to
            }}
            onSelect={range => setSelectedRange(range || { from: undefined, to: undefined })}
            initialFocus
            numberOfMonths={2}
          />
          
          <div className="p-4 border-t flex justify-between">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={applyDateRange}
              disabled={!selectedRange.from}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}