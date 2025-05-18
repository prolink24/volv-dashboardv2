import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useDateContext } from "@/providers/date-context";
import { CalendarIcon, CheckIcon, ChevronDownIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type DatePreset = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'custom';

/**
 * Enhanced date range picker with presets and comparison options
 */
export function ImprovedDateRangePicker() {
  const { startDate, endDate, setDateRange, includePreviousPeriod, setIncludePreviousPeriod } = useDateContext();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [currentPreset, setCurrentPreset] = useState<DatePreset>('thisMonth');
  
  // Format date range for display
  const formattedDateRange = startDate && endDate
    ? `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`
    : 'Select date range';
  
  // Apply a preset date range
  const applyPreset = (preset: DatePreset) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    let newStartDate: Date;
    let newEndDate: Date;
    
    switch (preset) {
      case 'today':
        newStartDate = new Date(today);
        newEndDate = new Date(today);
        break;
        
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        newStartDate = yesterday;
        newEndDate = yesterday;
        break;
        
      case 'last7days':
        newEndDate = new Date(today);
        newStartDate = new Date(today);
        newStartDate.setDate(newStartDate.getDate() - 6);
        break;
        
      case 'last30days':
        newEndDate = new Date(today);
        newStartDate = new Date(today);
        newStartDate.setDate(newStartDate.getDate() - 29);
        break;
        
      case 'thisMonth':
        newStartDate = new Date(currentYear, currentMonth, 1);
        newEndDate = new Date(currentYear, currentMonth + 1, 0);
        break;
        
      case 'lastMonth':
        newStartDate = new Date(currentYear, currentMonth - 1, 1);
        newEndDate = new Date(currentYear, currentMonth, 0);
        break;
        
      case 'custom':
        // Don't change the dates, just open the calendar
        setCalendarOpen(true);
        setCurrentPreset('custom');
        return;
        
      default:
        return;
    }
    
    setDateRange(newStartDate, newEndDate);
    setCurrentPreset(preset);
  };
  
  // Handle date selection from calendar
  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    
    if (!startDate || (startDate && endDate)) {
      // If no date selected yet or both dates are selected, set start date
      setDateRange(date, null);
    } else {
      // If only start date is selected, set end date
      // Ensure end date is after start date
      if (date < startDate) {
        setDateRange(date, startDate);
      } else {
        setDateRange(startDate, date);
      }
      // Close the calendar after selecting end date
      setCalendarOpen(false);
    }
    
    setCurrentPreset('custom');
  };
  
  // Handle toggling the comparison option
  const handleComparisonToggle = (checked: boolean) => {
    setIncludePreviousPeriod(checked);
  };
  
  return (
    <div className="flex flex-row flex-wrap gap-2 items-center">
      {/* Date picker */}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-10 px-3 py-2 w-auto text-sm"
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            {formattedDateRange}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={startDate || new Date()}
            selected={{ 
              from: startDate || undefined, 
              to: endDate || undefined 
            }}
            onSelect={(range) => {
              if (range?.from) handleSelect(range.from);
              if (range?.to) handleSelect(range.to);
            }}
            numberOfMonths={2}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      
      {/* Presets dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-10 px-3 py-2 text-sm">
            {currentPreset === 'custom' ? 'Custom Range' : 
             currentPreset === 'today' ? 'Today' :
             currentPreset === 'yesterday' ? 'Yesterday' :
             currentPreset === 'last7days' ? 'Last 7 Days' :
             currentPreset === 'last30days' ? 'Last 30 Days' :
             currentPreset === 'thisMonth' ? 'This Month' : 'Last Month'}
            <ChevronDownIcon className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => applyPreset('today')}>
            Today
            {currentPreset === 'today' && <CheckIcon className="h-4 w-4 ml-2" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => applyPreset('yesterday')}>
            Yesterday
            {currentPreset === 'yesterday' && <CheckIcon className="h-4 w-4 ml-2" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => applyPreset('last7days')}>
            Last 7 Days
            {currentPreset === 'last7days' && <CheckIcon className="h-4 w-4 ml-2" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => applyPreset('last30days')}>
            Last 30 Days
            {currentPreset === 'last30days' && <CheckIcon className="h-4 w-4 ml-2" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => applyPreset('thisMonth')}>
            This Month
            {currentPreset === 'thisMonth' && <CheckIcon className="h-4 w-4 ml-2" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => applyPreset('lastMonth')}>
            Last Month
            {currentPreset === 'lastMonth' && <CheckIcon className="h-4 w-4 ml-2" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => applyPreset('custom')}>
            Custom Range
            {currentPreset === 'custom' && <CheckIcon className="h-4 w-4 ml-2" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Comparison toggle */}
      <div className="flex items-center space-x-2">
        <Switch 
          id="compare-mode" 
          checked={includePreviousPeriod}
          onCheckedChange={handleComparisonToggle}
        />
        <Label htmlFor="compare-mode" className="text-sm">Compare with previous period</Label>
      </div>
    </div>
  );
}