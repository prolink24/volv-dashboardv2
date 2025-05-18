import React from 'react';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDateContext } from '@/providers/date-context';

/**
 * Date Range Picker Component
 * 
 * Allows user to select a date range for dashboard data
 * with optional comparison to previous period
 */
export function ImprovedDateRangePicker() {
  const { startDate, endDate, setDateRange, comparePreviousPeriod, setComparePreviousPeriod } = useDateContext();
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startDate,
    to: endDate
  });
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  // Handle date change in the calendar
  const handleDateChange = (range: DateRange | undefined) => {
    setDate(range);
    if (range?.from && range?.to) {
      setDateRange(range.from, range.to);
      if (isCalendarOpen) {
        setIsCalendarOpen(false);
      }
    }
  };

  // Predefined date ranges
  const selectThisMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setDate({ from: start, to: end });
    setDateRange(start, end);
  };

  const selectLastMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    setDate({ from: start, to: end });
    setDateRange(start, end);
  };

  const selectThisQuarter = () => {
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), currentQuarter * 3, 1);
    const end = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0);
    setDate({ from: start, to: end });
    setDateRange(start, end);
  };

  const selectLastQuarter = () => {
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const previousQuarter = currentQuarter - 1 < 0 ? 3 : currentQuarter - 1;
    const year = currentQuarter - 1 < 0 ? now.getFullYear() - 1 : now.getFullYear();
    const start = new Date(year, previousQuarter * 3, 1);
    const end = new Date(year, previousQuarter * 3 + 3, 0);
    setDate({ from: start, to: end });
    setDateRange(start, end);
  };

  const selectLast30Days = () => {
    const now = new Date();
    const end = new Date(now);
    const start = new Date(now);
    start.setDate(now.getDate() - 30);
    setDate({ from: start, to: end });
    setDateRange(start, end);
  };

  // Toggle comparison with previous period
  const handleComparisonToggle = (checked: boolean) => {
    setComparePreviousPeriod(checked);
  };

  return (
    <div className="flex flex-col space-y-2">
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal w-full",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col sm:flex-row">
            <div className="p-3 border-r">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Quick Select</h4>
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" size="sm" onClick={selectThisMonth}>This Month</Button>
                  <Button variant="ghost" size="sm" onClick={selectLastMonth}>Last Month</Button>
                  <Button variant="ghost" size="sm" onClick={selectThisQuarter}>This Quarter</Button>
                  <Button variant="ghost" size="sm" onClick={selectLastQuarter}>Last Quarter</Button>
                  <Button variant="ghost" size="sm" onClick={selectLast30Days}>Last 30 Days</Button>
                </div>
              </div>
            </div>
            <Calendar
              mode="range"
              selected={date}
              onSelect={handleDateChange}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
              className="rounded-md border"
            />
          </div>
        </PopoverContent>
      </Popover>
      
      <div className="flex items-center space-x-2">
        <Switch
          id="compare-previous"
          checked={comparePreviousPeriod}
          onCheckedChange={handleComparisonToggle}
        />
        <Label htmlFor="compare-previous" className="text-sm text-muted-foreground">
          Compare with previous period
        </Label>
      </div>
    </div>
  );
}