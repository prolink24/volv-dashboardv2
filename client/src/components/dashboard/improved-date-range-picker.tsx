import React from 'react';
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { useDateContext } from '@/providers/date-context';
import { cn, getDateRangeByOption } from '@/lib/utils';
import { format } from 'date-fns';

/**
 * Improved Date Range Picker Component
 * 
 * Allows users to select date ranges for filtering dashboard data
 * with options for custom ranges and presets
 */
export function ImprovedDateRangePicker() {
  const {
    startDate,
    endDate,
    setDateRange,
    comparePreviousPeriod,
    setComparePreviousPeriod,
    dateRangePreset,
    setDateRangePreset,
  } = useDateContext();

  // Format the date display
  const dateDisplay = `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;

  // Handle preset selection
  const handlePresetChange = (preset: string) => {
    setDateRangePreset(preset);
    const { start, end } = getDateRangeByOption(preset);
    setDateRange(start, end);
  };

  // Handle date selection in calendar
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    // If no date is selected yet or both dates are selected, start new selection
    if (!startDate || (startDate && endDate)) {
      setDateRange(date, date);
    } 
    // If start date is selected, select end date
    else if (startDate && !endDate) {
      // Ensure end date is not before start date
      if (date < startDate) {
        setDateRange(date, startDate);
      } else {
        setDateRange(startDate, date);
      }
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
        <Select value={dateRangePreset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="this-week">This Week</SelectItem>
            <SelectItem value="last-week">Last Week</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="last-month">Last Month</SelectItem>
            <SelectItem value="this-quarter">This Quarter</SelectItem>
            <SelectItem value="last-quarter">Last Quarter</SelectItem>
            <SelectItem value="this-year">This Year</SelectItem>
            <SelectItem value="last-year">Last Year</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[240px] justify-start text-left font-normal",
                !startDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateDisplay}
              <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{
                from: startDate,
                to: endDate,
              }}
              onSelect={(range) => {
                if (range?.from) {
                  setDateRange(range.from, range.to || range.from);
                  setDateRangePreset('custom');
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="compare-period"
          checked={comparePreviousPeriod}
          onCheckedChange={setComparePreviousPeriod}
        />
        <Label htmlFor="compare-period">Compare to previous period</Label>
      </div>
    </div>
  );
}