import React, { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDateContext } from '@/providers/date-context';

export interface ImprovedDateRangePickerProps {
  className?: string;
}

export function ImprovedDateRangePicker({ className }: ImprovedDateRangePickerProps) {
  const { dateRange, setDateRange } = useDateContext();
  const [isOpen, setIsOpen] = useState(false);
  
  // Preset date ranges
  const presets = {
    'today': { label: 'Today', days: 0 },
    'yesterday': { label: 'Yesterday', days: 1 },
    'last7': { label: 'Last 7 days', days: 7 },
    'last14': { label: 'Last 14 days', days: 14 },
    'last30': { label: 'Last 30 days', days: 30 },
    'last90': { label: 'Last 90 days', days: 90 },
    'thisMonth': { label: 'This month', days: 'month' },
    'lastMonth': { label: 'Last month', days: 'lastMonth' },
    'thisYear': { label: 'This year', days: 'year' },
    'custom': { label: 'Custom', days: null },
  };
  
  const [selectedPreset, setSelectedPreset] = useState<string>('last30');
  
  // Handle preset change
  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    if (value !== 'custom') {
      const preset = presets[value as keyof typeof presets];
      
      const end = new Date();
      let start = new Date();
      
      if (preset.days === 'month') {
        // This month
        start = new Date(end.getFullYear(), end.getMonth(), 1);
      } else if (preset.days === 'lastMonth') {
        // Last month
        start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
        end.setDate(0); // Last day of previous month
      } else if (preset.days === 'year') {
        // This year
        start = new Date(end.getFullYear(), 0, 1);
      } else if (typeof preset.days === 'number') {
        // Days ago
        if (preset.days === 0) {
          // Today
          start.setHours(0, 0, 0, 0);
        } else if (preset.days === 1) {
          // Yesterday
          start = new Date(end);
          start.setDate(start.getDate() - 1);
          start.setHours(0, 0, 0, 0);
          end = new Date(start);
          end.setHours(23, 59, 59, 999);
        } else {
          // X days ago
          start.setDate(end.getDate() - preset.days);
        }
      }
      
      setDateRange({
        from: start,
        to: end,
      });
    }
  };
  
  // Format the date range for display
  const formatDateRange = () => {
    if (!dateRange.from) {
      return 'Select date range';
    }
    
    if (!dateRange.to) {
      return format(dateRange.from, 'PPP');
    }
    
    return `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`;
  };
  
  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            size="sm"
            className={cn(
              'h-9 w-[260px] justify-start text-left font-normal',
              !dateRange.from && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="px-4 py-3 border-b">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Select range</h4>
              <p className="text-xs text-muted-foreground">
                Filter data based on date range
              </p>
            </div>
            <div className="flex gap-2 mt-3">
              <Select
                defaultValue={selectedPreset}
                onValueChange={handlePresetChange}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select preset" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {Object.entries(presets).map(([key, preset]) => (
                    <SelectItem key={key} value={key}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="p-3">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={{
                from: dateRange.from || undefined,
                to: dateRange.to || undefined,
              }}
              onSelect={(range) => {
                if (range?.from) {
                  setDateRange({
                    from: range.from,
                    to: range.to || range.from,
                  });
                  
                  if (range.to) {
                    setSelectedPreset('custom');
                  }
                } else {
                  setDateRange({ from: null, to: null });
                }
              }}
              numberOfMonths={2}
            />
          </div>
          <div className="p-3 border-t">
            <Button
              size="sm"
              className="w-full"
              onClick={() => setIsOpen(false)}
            >
              Apply range
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}