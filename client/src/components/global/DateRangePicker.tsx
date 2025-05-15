import { useState, useRef, useEffect } from 'react';
import { CalendarIcon, ChevronDownIcon, CheckIcon } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useDateRange, dateRangePresets } from '@/hooks/use-date-range';

export function DateRangePicker() {
  const { 
    dateRange, 
    setDateRange, 
    presetKey, 
    setPresetKey,
    dateRangePresets 
  } = useDateRange();
  
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isPresetOpen, setIsPresetOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState({
    from: dateRange.startDate,
    to: dateRange.endDate,
  });

  // Reset the selectedRange when dateRange changes from outside
  useEffect(() => {
    setSelectedRange({
      from: dateRange.startDate,
      to: dateRange.endDate,
    });
  }, [dateRange]);

  // Apply the selected range
  const handleApply = () => {
    if (selectedRange.from && selectedRange.to) {
      setDateRange({
        startDate: selectedRange.from,
        endDate: selectedRange.to,
      });
    }
    setIsCalendarOpen(false);
  };

  // Format the date range for display
  const formatDisplayDateRange = () => {
    if (presetKey && dateRangePresets[presetKey]?.label) {
      return dateRangePresets[presetKey].label;
    }
    
    const startStr = isValid(dateRange.startDate) 
      ? format(dateRange.startDate, 'MMM d, yyyy')
      : 'Start date';
      
    const endStr = isValid(dateRange.endDate) 
      ? format(dateRange.endDate, 'MMM d, yyyy')
      : 'End date';
      
    return `${startStr} - ${endStr}`;
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Preset dropdown */}
      <Popover open={isPresetOpen} onOpenChange={setIsPresetOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-[180px] justify-between"
            size="sm"
          >
            <span className="truncate">
              {presetKey ? dateRangePresets[presetKey]?.label : "Select preset"}
            </span>
            <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search presets..." />
            <CommandList>
              <CommandEmpty>No presets found.</CommandEmpty>
              <CommandGroup>
                {Object.entries(dateRangePresets).map(([key, value]) => (
                  <CommandItem
                    key={key}
                    onSelect={() => {
                      setPresetKey(key);
                      setIsPresetOpen(false);
                    }}
                    className="flex items-center"
                  >
                    <span>{value.label}</span>
                    {presetKey === key && (
                      <CheckIcon className="ml-auto h-4 w-4" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Date range picker */}
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date-range"
            variant="outline"
            className={cn(
              "w-[280px] justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
            size="sm"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDisplayDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 border-b">
            <div className="space-y-1">
              <h4 className="font-medium text-sm">Select date range</h4>
              <p className="text-xs text-muted-foreground">
                Choose a start and end date for filtering data
              </p>
            </div>
          </div>
          <Calendar
            mode="range"
            selected={selectedRange}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                setSelectedRange({
                  from: range.from,
                  to: range.to,
                });
              }
            }}
            numberOfMonths={2}
            defaultMonth={dateRange.startDate}
          />
          <div className="flex items-center justify-end gap-2 p-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCalendarOpen(false)}
            >
              Cancel
            </Button>
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
    </div>
  );
}

// This component can be placed in the layout or header to be available globally
export function GlobalDateRangePicker() {
  return (
    <div className="px-4 py-3 border-b">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Date Range Filter</h3>
        <DateRangePicker />
      </div>
    </div>
  );
}