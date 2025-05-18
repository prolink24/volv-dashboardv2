import React, { useState, useRef, useEffect } from 'react';
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
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Check, ChevronDown } from 'lucide-react';
import { useDateRange } from '@/providers/date-context';
import { DateRange } from '@/providers/date-context';

export interface ImprovedDateRangePickerProps {
  className?: string;
}

export function ImprovedDateRangePicker({ className }: ImprovedDateRangePickerProps) {
  const { 
    dateRange, 
    applyDateRange, 
    presetRanges, 
    selectedPreset, 
    setSelectedPreset 
  } = useDateRange();
  
  const [isOpen, setIsOpen] = useState(false);
  const [localDateRange, setLocalDateRange] = useState<DateRange>(dateRange);
  
  // Update local date range when context date range changes
  useEffect(() => {
    setLocalDateRange(dateRange);
  }, [dateRange]);
  
  // Handle preset selection
  const handlePresetSelect = (value: string) => {
    const preset = presetRanges.find(p => p.label === value);
    if (preset) {
      setLocalDateRange({
        ...preset.range,
        label: preset.label
      });
      setSelectedPreset(preset.label);
    }
  };
  
  // Apply the date range selection and close the popover
  const handleApply = () => {
    applyDateRange(localDateRange);
    setIsOpen(false);
  };
  
  // Reset to the current date range from context
  const handleCancel = () => {
    setLocalDateRange(dateRange);
    setIsOpen(false);
  };
  
  // Format the date range for display
  const formatDateRange = () => {
    if (selectedPreset) {
      return selectedPreset;
    }
    
    return `${format(dateRange.startDate, 'MMM d, yyyy')} - ${format(dateRange.endDate, 'MMM d, yyyy')}`;
  };
  
  return (
    <div className={cn('relative', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className={cn(
              'justify-between w-auto min-w-[240px] px-3 py-2 h-9 text-sm font-medium',
              isOpen && 'border-primary'
            )}
          >
            <div className="flex items-center">
              <CalendarIcon className="mr-2 h-4 w-4" />
              <span>{formatDateRange()}</span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-auto p-0" align="start">
          <div className="grid gap-4 p-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Date Range</h4>
              <Select
                value={selectedPreset || ''}
                onValueChange={handlePresetSelect}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  {presetRanges.map((preset) => (
                    <SelectItem key={preset.label} value={preset.label}>
                      <div className="flex items-center">
                        {selectedPreset === preset.label && (
                          <Check className="mr-1 h-3 w-3" />
                        )}
                        <span>{preset.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs font-medium mb-1">Start Date</div>
                  <div className="border rounded-md p-2 text-sm">
                    {format(localDateRange.startDate, 'MMM d, yyyy')}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium mb-1">End Date</div>
                  <div className="border rounded-md p-2 text-sm">
                    {format(localDateRange.endDate, 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1">
                <Calendar
                  mode="range"
                  selected={{
                    from: localDateRange.startDate,
                    to: localDateRange.endDate,
                  }}
                  onSelect={(range) => {
                    if (range && range.from && range.to) {
                      setLocalDateRange({
                        startDate: range.from,
                        endDate: range.to,
                      });
                      setSelectedPreset(null);
                    }
                  }}
                  numberOfMonths={1}
                  disabled={(date) => date > new Date()}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button 
                size="sm"
                onClick={handleApply}
              >
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}