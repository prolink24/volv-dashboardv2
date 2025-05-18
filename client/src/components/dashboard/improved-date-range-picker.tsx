import React from 'react';
import { CalendarIcon, ChevronDownIcon } from 'lucide-react';
import { addDays, format } from 'date-fns';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDateContext } from '@/providers/date-context';
import { getDateRangeByOption } from '@/lib/utils';

const presets = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'this-week' },
  { label: 'Last Week', value: 'last-week' },
  { label: 'This Month', value: 'this-month' },
  { label: 'Last Month', value: 'last-month' },
  { label: 'This Quarter', value: 'this-quarter' },
  { label: 'Last Quarter', value: 'last-quarter' },
  { label: 'This Year', value: 'this-year' },
  { label: 'Last Year', value: 'last-year' },
];

export function ImprovedDateRangePicker() {
  const { currentRange, previousRange, setDateRange } = useDateContext();
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedPreset, setSelectedPreset] = React.useState<string>('this-month');
  const [date, setDate] = React.useState<{ from: Date; to: Date }>({
    from: currentRange.startDate,
    to: currentRange.endDate,
  });
  const [compareEnabled, setCompareEnabled] = React.useState<boolean>(!!previousRange);

  // Apply preset date range
  const applyPreset = (presetValue: string) => {
    setSelectedPreset(presetValue);
    
    const newRange = getDateRangeByOption(presetValue);
    setDate({
      from: newRange.start,
      to: newRange.end,
    });
    
    // Calculate previous range for comparison if enabled
    if (compareEnabled) {
      // For this example, we'll simply offset the dates by the range duration
      const duration = newRange.end.getTime() - newRange.start.getTime();
      const prevStart = new Date(newRange.start.getTime() - duration);
      const prevEnd = new Date(newRange.end.getTime() - duration);
      
      setDateRange(
        { startDate: newRange.start, endDate: newRange.end, label: presetValue },
        { startDate: prevStart, endDate: prevEnd }
      );
    } else {
      setDateRange(
        { startDate: newRange.start, endDate: newRange.end, label: presetValue },
        null
      );
    }
    
    setIsOpen(false);
  };

  // Apply custom date range
  const applyDateRange = () => {
    if (!date.from || !date.to) {
      return;
    }
    
    if (compareEnabled) {
      // Calculate previous range for comparison if enabled
      const duration = date.to.getTime() - date.from.getTime();
      const prevStart = new Date(date.from.getTime() - duration);
      const prevEnd = new Date(date.to.getTime() - duration);
      
      setDateRange(
        { startDate: date.from, endDate: date.to, label: 'Custom' },
        { startDate: prevStart, endDate: prevEnd }
      );
    } else {
      setDateRange(
        { startDate: date.from, endDate: date.to, label: 'Custom' },
        null
      );
    }
    
    setIsOpen(false);
  };

  // Handle toggle comparison period
  const handleCompareToggle = (checked: boolean) => {
    setCompareEnabled(checked);
  };

  return (
    <div className="grid gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className="w-full justify-between text-left font-normal md:w-[300px]"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span>
              {currentRange.label || `${format(currentRange.startDate, 'LLL dd, yyyy')} - ${format(currentRange.endDate, 'LLL dd, yyyy')}`}
            </span>
            <ChevronDownIcon className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="space-y-4 p-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="preset">Preset</Label>
                <Select
                  value={selectedPreset}
                  onValueChange={(value) => applyPreset(value)}
                >
                  <SelectTrigger id="preset">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="compare" 
                    checked={compareEnabled}
                    onCheckedChange={handleCompareToggle}
                  />
                  <Label htmlFor="compare">Compare to previous period</Label>
                </div>
              </div>
              
              <div className="grid gap-2">
                <div className="flex flex-col space-y-2">
                  <Label>Custom Range</Label>
                  <div className="flex flex-col space-y-2">
                    <Calendar
                      mode="range"
                      selected={{
                        from: date.from,
                        to: date.to,
                      }}
                      onSelect={(selected) => {
                        if (selected?.from && selected?.to) {
                          setDate({
                            from: selected.from,
                            to: selected.to,
                          });
                        }
                      }}
                      numberOfMonths={2}
                      disabled={(date) => date > new Date()}
                    />
                  </div>
                </div>
              </div>
              
              <Button onClick={applyDateRange}>Apply Custom Range</Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}