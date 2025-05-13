import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, Loader2 } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChannelData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface AttributionChannelsProps {
  data?: {
    channels?: ChannelData[];
    title?: string;
    description?: string;
    isLoading?: boolean;
    isEmpty?: boolean;
  };
}

export const AttributionChannels = ({ data }: AttributionChannelsProps) => {
  if (!data || data.isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Channel Attribution</CardTitle>
          <CardDescription>Loading channel data...</CardDescription>
        </CardHeader>
        <CardContent className="pt-2 flex justify-center items-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
        </CardContent>
      </Card>
    );
  }

  const { channels = [], title = "Channel Attribution", description = "Attribution by marketing channel" } = data;

  if (channels.length === 0 || data.isEmpty) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-2 flex justify-center items-center h-48 text-center">
          <div className="text-muted-foreground">
            <p>No channel data available</p>
            <p className="text-xs mt-2">Run attribution to generate channel insights</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort channels by value, highest first
  const sortedChannels = [...channels].sort((a, b) => b.value - a.value);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-4">
          {sortedChannels.map((channel, index) => (
            <div key={index}>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: channel.color || `hsl(${index * 40}, 70%, 50%)` }}
                  />
                  <span className="text-sm">{channel.name}</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 ml-1 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Based on {channel.value} touchpoints</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="text-sm font-medium">{channel.percentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mb-3">
                <div 
                  className="h-2 rounded-full" 
                  style={{ 
                    width: `${channel.percentage}%`,
                    backgroundColor: channel.color || `hsl(${index * 40}, 70%, 50%)`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AttributionChannels;