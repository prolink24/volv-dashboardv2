import { useState, useCallback, useEffect, useMemo } from "react";
import { format, isEqual, addDays, subDays, subMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, isSameMonth, isSameYear } from "date-fns";
import { CalendarIcon, RotateCw, FilterIcon, ArrowRightIcon } from "lucide-react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger,
  Button,
  ButtonGroup, 
  Calendar, 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Badge,
  Separator
} from "@/components/ui";
import { useDateRange, DateRange } from "@/providers/date-context";

/**
 * Date range presets organized by category
 */
const presetCategories = {
  common: [
    { 
      id: "today",
      label: "Today", 
      description: "Data from today only",
      getValue: () => {
        const today = new Date();
        return { startDate: today, endDate: today };
      }
    },
    { 
      id: "yesterday",
      label: "Yesterday", 
      description: "Data from yesterday only",
      getValue: () => {
        const yesterday = subDays(new Date(), 1);
        return { startDate: yesterday, endDate: yesterday };
      }
    },
    { 
      id: "last7days",
      label: "Last 7 days", 
      description: "Data from the past 7 days",
      getValue: () => ({
        startDate: subDays(new Date(), 6),
        endDate: new Date(),
      })
    },
    { 
      id: "last30days",
      label: "Last 30 days", 
      description: "Data from the past 30 days",
      getValue: () => ({
        startDate: subDays(new Date(), 29),
        endDate: new Date(),
      })
    }
  ],
  months: [
    { 
      id: "thisMonth",
      label: "This month", 
      description: "All data from the current month",
      getValue: () => {
        const now = new Date();
        return {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now),
        };
      }
    },
    { 
      id: "lastMonth",
      label: "Last month", 
      description: "All data from the previous month",
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
      id: "last3Months",
      label: "Last 3 months", 
      description: "Data from the past 3 months",
      getValue: () => {
        const now = new Date();
        return {
          startDate: startOfMonth(subMonths(now, 2)),
          endDate: endOfMonth(now),
        };
      }
    }
  ],
  quarters: [
    { 
      id: "thisQuarter",
      label: "This quarter", 
      description: "All data from the current quarter",
      getValue: () => {
        const now = new Date();
        return {
          startDate: startOfQuarter(now),
          endDate: endOfQuarter(now),
        };
      }
    },
    { 
      id: "lastQuarter",
      label: "Last quarter", 
      description: "All data from the previous quarter",
      getValue: () => {
        const now = new Date();
        const lastQuarter = new Date(now);
        lastQuarter.setMonth(now.getMonth() - 3);
        return {
          startDate: startOfQuarter(lastQuarter),
          endDate: endOfQuarter(lastQuarter),
        };
      }
    }
  ],
  years: [
    { 
      id: "thisYear",
      label: "This year", 
      description: "All data from the current year",
      getValue: () => {
        const now = new Date();
        return {
          startDate: startOfYear(now),
          endDate: endOfYear(now),
        };
      }
    },
    { 
      id: "lastYear",
      label: "Last year", 
      description: "All data from the previous year",
      getValue: () => {
        const now = new Date();
        const lastYear = new Date(now.getFullYear() - 1, 0, 1);
        return {
          startDate: startOfYear(lastYear),
          endDate: endOfYear(lastYear),
        };
      }
    }
  ]
};

// Flatten presets for easier lookup
const allPresets = [
  ...presetCategories.common,
  ...presetCategories.months,
  ...presetCategories.quarters,
  ...presetCategories.years
];

/**
 * Generate a human-readable label for a date range
 */
function generateRangeLabel(startDate: Date, endDate: Date): string {
  if (isEqual(startDate, endDate)) {
    // Single day
    return format(startDate, 'MMMM d, yyyy');
  } else if (isSameMonth(startDate, endDate) && isSameYear(startDate, endDate)) {
    // Same month
    return `${format(startDate, 'MMMM d')} - ${format(endDate, 'd')}, ${format(endDate, 'yyyy')}`;
  } else if (isSameYear(startDate, endDate)) {
    // Same year, different months
    return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}, ${format(endDate, 'yyyy')}`;
  } else {
    // Different years
    return `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;
  }
}

/**
 * Enhanced DateRangePicker component for selecting date ranges
 */
export function DateRangePicker() {
  const { dateRange, setDateRange, isLoading, refreshData } = useDateRange();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("range");
  
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
      
      // Generate human readable label
      const label = generateRangeLabel(start, end);
      
      console.log("[DateRangePicker] Applying custom date range:", { start, end, label });
      
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
  const applyPreset = useCallback((presetId: string) => {
    const preset = allPresets.find(p => p.id === presetId);
    
    if (preset) {
      const { startDate, endDate } = preset.getValue();
      const label = preset.label;
      
      console.log("[DateRangePicker] Applying preset:", label, { startDate, endDate });
      
      setSelectedRange({
        from: startDate,
        to: endDate
      });
      
      setDateRange({
        startDate,
        endDate,
        label,
        preset: preset.id
      });
      
      setIsOpen(false);
    }
  }, [setDateRange]);
  
  // Handle refresh button click
  const handleRefresh = useCallback(() => {
    console.log("[DateRangePicker] Refreshing data with current date range");
    refreshData();
  }, [refreshData]);
  
  // Find currently active preset if any
  const activePresetId = dateRange.preset;
  
  // Memoize displayed date to prevent unnecessary re-renders
  const displayedDate = useMemo(() => {
    return dateRange.label;
  }, [dateRange.label]);
  
  return (
    <div className="relative flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="min-w-[240px] max-w-[320px] justify-start text-left font-normal flex items-center"
            type="button"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className="flex-1 truncate">{displayedDate}</span>
            {isLoading && (
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-[680px]">
            <div className="px-4 pt-4 pb-2 border-b">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="presets">Presets</TabsTrigger>
                <TabsTrigger value="range">Custom Range</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="presets" className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm mb-3">Common Ranges</h4>
                  <div className="space-y-2">
                    {presetCategories.common.map(preset => (
                      <Button
                        key={preset.id}
                        variant={preset.id === activePresetId ? "default" : "outline"}
                        className="w-full justify-start text-left"
                        onClick={() => applyPreset(preset.id)}
                      >
                        {preset.label}
                        {preset.id === activePresetId && (
                          <Badge variant="outline" className="ml-auto">
                            Active
                          </Badge>
                        )}
                      </Button>
                    ))}
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <h4 className="font-medium text-sm mb-3">Months</h4>
                  <div className="space-y-2">
                    {presetCategories.months.map(preset => (
                      <Button
                        key={preset.id}
                        variant={preset.id === activePresetId ? "default" : "outline"}
                        className="w-full justify-start text-left"
                        onClick={() => applyPreset(preset.id)}
                      >
                        {preset.label}
                        {preset.id === activePresetId && (
                          <Badge variant="outline" className="ml-auto">
                            Active
                          </Badge>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm mb-3">Quarters</h4>
                  <div className="space-y-2">
                    {presetCategories.quarters.map(preset => (
                      <Button
                        key={preset.id}
                        variant={preset.id === activePresetId ? "default" : "outline"}
                        className="w-full justify-start text-left"
                        onClick={() => applyPreset(preset.id)}
                      >
                        {preset.label}
                        {preset.id === activePresetId && (
                          <Badge variant="outline" className="ml-auto">
                            Active
                          </Badge>
                        )}
                      </Button>
                    ))}
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <h4 className="font-medium text-sm mb-3">Years</h4>
                  <div className="space-y-2">
                    {presetCategories.years.map(preset => (
                      <Button
                        key={preset.id}
                        variant={preset.id === activePresetId ? "default" : "outline"}
                        className="w-full justify-start text-left"
                        onClick={() => applyPreset(preset.id)}
                      >
                        {preset.label}
                        {preset.id === activePresetId && (
                          <Badge variant="outline" className="ml-auto">
                            Active
                          </Badge>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="range" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 p-4">
                  <div className="flex flex-col items-center justify-center h-full space-y-4">
                    <div className="text-center space-y-2">
                      <h4 className="font-medium">Select a date range</h4>
                      <p className="text-sm text-muted-foreground">
                        Choose start and end dates for your data
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="p-2 border rounded">
                        {selectedRange.from ? format(selectedRange.from, 'MMM d, yyyy') : 'Start date'}
                      </div>
                      <ArrowRightIcon className="h-4 w-4" />
                      <div className="p-2 border rounded">
                        {selectedRange.to ? format(selectedRange.to, 'MMM d, yyyy') : 'End date'}
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {selectedRange.from && selectedRange.to ? (
                        isEqual(selectedRange.from, selectedRange.to) ? 
                          'Viewing data for a single day' :
                          `Range spans ${Math.round((selectedRange.to.getTime() - selectedRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1} days`
                      ) : 'Select both dates to apply range'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <Calendar
                    mode="range"
                    selected={{
                      from: selectedRange.from,
                      to: selectedRange.to
                    }}
                    onSelect={range => setSelectedRange(range || { from: undefined, to: undefined })}
                    initialFocus
                    numberOfMonths={1}
                    className="rounded-md border"
                  />
                </div>
              </div>
              
              <div className="p-4 border-t flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={applyDateRange}
                  disabled={!selectedRange.from || !selectedRange.to}
                >
                  Apply Range
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              size="icon" 
              variant="outline" 
              className="h-10 w-10"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RotateCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Refresh data with current date range
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}