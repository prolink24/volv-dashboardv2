import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TimeSeriesDataPoint {
  timestamp: string | Date;
  value: number;
}

interface TimeSeriesChartProps {
  title: string;
  description: string;
  data: TimeSeriesDataPoint[];
  yAxisLabel?: string;
  height?: number;
  lineColor?: string;
}

export function TimeSeriesChart({
  title,
  description,
  data,
  yAxisLabel = "Value",
  height = 200,
  lineColor = "#10b981" // Default to green
}: TimeSeriesChartProps) {
  // Sort data by timestamp
  const sortedData = [...data].sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return dateA - dateB;
  });

  // Calculate min and max values for scaling
  const values = sortedData.map(point => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  
  // Add a small padding to the max and min values
  const padding = (maxValue - minValue) * 0.1;
  const adjustedMinValue = Math.max(0, minValue - padding);
  const adjustedMaxValue = maxValue + padding;

  // Calculate points for SVG path
  const calculatePoints = () => {
    if (sortedData.length === 0) return "";
    
    const timeRange = new Date(sortedData[sortedData.length - 1].timestamp).getTime() - 
                      new Date(sortedData[0].timestamp).getTime();
    
    return sortedData.map((point, index) => {
      // X position based on time difference from the first point
      const x = index === 0 
        ? 0 
        : ((new Date(point.timestamp).getTime() - new Date(sortedData[0].timestamp).getTime()) / timeRange) * 100;
      
      // Y position based on value (inverted because SVG y=0 is at the top)
      const normalizedValue = adjustedMaxValue === adjustedMinValue 
        ? 50 // If all values are the same, plot in the middle
        : 100 - (((point.value - adjustedMinValue) / (adjustedMaxValue - adjustedMinValue)) * 100);
      
      return `${x}% ${normalizedValue}%`;
    }).join(" L ");
  };

  const points = calculatePoints();
  const path = points ? `M ${points}` : "";

  // Format date for tooltip
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription>
          {yAxisLabel}: {sortedData.length > 0 ? sortedData[sortedData.length - 1].value.toLocaleString() : 'No data'}
          {sortedData.length > 1 && (
            <span className={
              sortedData[sortedData.length - 1].value > sortedData[sortedData.length - 2].value
                ? "text-green-500 ml-2"
                : sortedData[sortedData.length - 1].value < sortedData[sortedData.length - 2].value
                  ? "text-red-500 ml-2"
                  : "ml-2"
            }>
              {sortedData[sortedData.length - 1].value > sortedData[sortedData.length - 2].value ? "↑" : "↓"}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ height: `${height}px`, position: 'relative' }}>
          {/* Y-axis label */}
          <div className="absolute left-0 top-0 bottom-0 flex items-center text-xs text-muted-foreground" style={{ transform: 'rotate(-90deg)', transformOrigin: 'left bottom', width: height }}>
            {yAxisLabel}
          </div>
          
          {/* Chart area */}
          <div className="pl-6 h-full flex flex-col justify-between">
            {/* Chart grid */}
            <div className="relative h-full">
              {/* Grid lines */}
              <div className="absolute inset-0 grid grid-cols-1 grid-rows-4">
                <div className="border-t border-gray-200"></div>
                <div className="border-t border-gray-200"></div>
                <div className="border-t border-gray-200"></div>
                <div className="border-t border-gray-200"></div>
              </div>
              
              {/* Value labels */}
              <div className="absolute inset-y-0 left-0 w-6 flex flex-col justify-between text-xs text-muted-foreground">
                <div className="transform -translate-y-1/2">{adjustedMaxValue.toLocaleString()}</div>
                <div className="transform -translate-y-1/2">{((adjustedMaxValue + adjustedMinValue) * 0.75).toLocaleString()}</div>
                <div className="transform -translate-y-1/2">{((adjustedMaxValue + adjustedMinValue) * 0.5).toLocaleString()}</div>
                <div className="transform -translate-y-1/2">{((adjustedMaxValue + adjustedMinValue) * 0.25).toLocaleString()}</div>
                <div className="transform -translate-y-1/2">{adjustedMinValue.toLocaleString()}</div>
              </div>
              
              {/* Chart line */}
              {sortedData.length > 1 && (
                <svg className="absolute inset-0" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <path
                    d={path}
                    fill="none"
                    stroke={lineColor}
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              )}
              
              {/* Data points with tooltips */}
              {sortedData.length > 0 && (
                <div className="absolute inset-0">
                  {sortedData.map((point, index) => {
                    const timeRange = new Date(sortedData[sortedData.length - 1].timestamp).getTime() - 
                                      new Date(sortedData[0].timestamp).getTime();
                    const left = index === 0 
                      ? 0 
                      : ((new Date(point.timestamp).getTime() - new Date(sortedData[0].timestamp).getTime()) / timeRange) * 100;
                    
                    const top = adjustedMaxValue === adjustedMinValue 
                      ? 50 
                      : 100 - (((point.value - adjustedMinValue) / (adjustedMaxValue - adjustedMinValue)) * 100);
                    
                    return (
                      <TooltipProvider key={index}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div 
                              className="absolute h-2 w-2 rounded-full bg-white border-2 cursor-pointer"
                              style={{ 
                                left: `${left}%`, 
                                top: `${top}%`,
                                borderColor: lineColor,
                                transform: 'translate(-50%, -50%)'
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs">
                              <div>{formatDate(new Date(point.timestamp))}</div>
                              <div className="font-semibold">{yAxisLabel}: {point.value.toLocaleString()}</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* X-axis time labels */}
            {sortedData.length > 1 && (
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{formatDate(new Date(sortedData[0].timestamp))}</span>
                {sortedData.length > 2 && (
                  <span>{formatDate(new Date(sortedData[Math.floor(sortedData.length / 2)].timestamp))}</span>
                )}
                <span>{formatDate(new Date(sortedData[sortedData.length - 1].timestamp))}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}