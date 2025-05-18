import React, { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { DateRange } from '@/providers/date-context';
import { useDateContext } from '@/providers/date-context';
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

type DatePreset = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'custom';

export function ImprovedDateRangePicker() {
  const { dateRange, setDateRange } = useDateContext();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>('last30days');
  
  // Apply a preset date range
  const applyPreset = (preset: DatePreset) => {
    setSelectedPreset(preset);
    
    const today = new Date();
    let start: Date | null = null;
    let end: Date | null = today;
    
    switch (preset) {
      case 'today':
        start = today;
        break;
      case 'yesterday':
        start = end = subDays(today, 1);
        break;
      case 'last7days':
        start = subDays(today, 6);
        break;
      case 'last30days':
        start = subDays(today, 29);
        break;
      case 'thisMonth':
        start = startOfMonth(today);
        break;
      case 'lastMonth':
        start = startOfMonth(subMonths(today, 1));
        end = endOfMonth(subMonths(today, 1));
        break;
      case 'custom':
        // Don't change the date range for custom
        return;
    }
    
    setDateRange({ from: start, to: end });
  };
  
  // Format the date range for display
  const formatDateRange = () => {
    if (!dateRange.from) return 'Select date range';
    
    if (dateRange.from && dateRange.to) {
      if (format(dateRange.from, 'PP') === format(dateRange.to, 'PP')) {
        return format(dateRange.from, 'PP');
      }
      return `${format(dateRange.from, 'PP')} - ${format(dateRange.to, 'PP')}`;
    }
    
    return format(dateRange.from, 'PP');
  };
  
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Select
        value={selectedPreset}
        onValueChange={(value) => applyPreset(value as DatePreset)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="yesterday">Yesterday</SelectItem>
          <SelectItem value="last7days">Last 7 days</SelectItem>
          <SelectItem value="last30days">Last 30 days</SelectItem>
          <SelectItem value="thisMonth">This month</SelectItem>
          <SelectItem value="lastMonth">Last month</SelectItem>
          <SelectItem value="custom">Custom range</SelectItem>
        </SelectContent>
      </Select>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal w-full sm:w-[240px]",
              !dateRange.from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{ 
              from: dateRange.from ? new Date(dateRange.from) : undefined, 
              to: dateRange.to ? new Date(dateRange.to) : undefined 
            }}
            onSelect={(range) => {
              if (range?.from || range?.to) {
                setDateRange({
                  from: range.from || null,
                  to: range.to || range.from || null
                });
                setSelectedPreset('custom');
              }
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}