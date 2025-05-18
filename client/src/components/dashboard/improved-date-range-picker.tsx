import React, { useState } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useDateRange } from '@/providers/date-context';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';

export interface ImprovedDateRangePickerProps {
  className?: string;
}

export function ImprovedDateRangePicker({ className }: ImprovedDateRangePickerProps) {
  const { dateRange, setDateRange, presetRanges, applyDateRange } = useDateRange();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [tempDateRange, setTempDateRange] = useState({
    from: dateRange.startDate,
    to: dateRange.endDate,
  });

  // Format the currently selected date range for display
  const formattedDateRange = React.useMemo(() => {
    return `${format(dateRange.startDate, 'MMM d, yyyy')} - ${format(dateRange.endDate, 'MMM d, yyyy')}`;
  }, [dateRange.startDate, dateRange.endDate]);

  // Handle preset selection
  const handlePresetSelect = (value: string) => {
    setSelectedPreset(value);
    
    // Find the selected preset
    const preset = presetRanges.find(preset => preset.label === value);
    
    if (preset) {
      // Update the temporary date range
      setTempDateRange({
        from: preset.range.startDate,
        to: preset.range.endDate,
      });
    }
  };

  // Apply the date range and close the popover
  const handleApply = () => {
    if (tempDateRange.from && tempDateRange.to) {
      applyDateRange({
        startDate: tempDateRange.from,
        endDate: tempDateRange.to,
        label: selectedPreset || undefined,
      });
    }
    
    setIsOpen(false);
  };

  // Reset to the current date range
  const handleCancel = () => {
    setTempDateRange({
      from: dateRange.startDate,
      to: dateRange.endDate,
    });
    setSelectedPreset(null);
    setIsOpen(false);
  };

  // When date range changes externally, update the temp range
  React.useEffect(() => {
    setTempDateRange({
      from: dateRange.startDate,
      to: dateRange.endDate,
    });
  }, [dateRange.startDate, dateRange.endDate]);

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-10 px-3 py-2 justify-start text-left font-normal',
              !dateRange && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formattedDateRange}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-4 space-y-4">
            <div className="grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <h3 className="text-sm font-medium mb-1">Start Date</h3>
                  <div className="text-sm">{tempDateRange.from ? format(tempDateRange.from, 'PPP') : 'Pick a date'}</div>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-1">End Date</h3>
                  <div className="text-sm">{tempDateRange.to ? format(tempDateRange.to, 'PPP') : 'Pick a date'}</div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-1">Preset Ranges</h3>
              <Select value={selectedPreset || ''} onValueChange={handlePresetSelect}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a preset" />
                </SelectTrigger>
                <SelectContent>
                  {presetRanges.map((preset) => (
                    <SelectItem key={preset.label} value={preset.label}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Calendar
                mode="range"
                selected={{ 
                  from: tempDateRange.from, 
                  to: tempDateRange.to 
                }}
                onSelect={(range) => {
                  if (range) {
                    // Reset preset selection if manually selecting dates
                    setSelectedPreset(null);
                    setTempDateRange({
                      from: range.from || tempDateRange.from,
                      to: range.to || range.from || tempDateRange.to,
                    });
                  }
                }}
                initialFocus
                numberOfMonths={2}
                className="rounded-md border shadow"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleApply}>
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}