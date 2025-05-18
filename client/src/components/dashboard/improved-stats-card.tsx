import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsItem {
  name: string;
  value: number | string;
  description?: string;
}

interface ImprovedStatsCardProps {
  title: string;
  description?: string;
  items: StatsItem[];
  isLoading?: boolean;
  className?: string;
}

export function ImprovedStatsCard({ 
  title, 
  description, 
  items,
  isLoading = false,
  className = ""
}: ImprovedStatsCardProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-1/3 mb-1" />
          <Skeleton className="h-3 w-2/3" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            {[1, 2, 3].map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{item.name}</span>
                {item.description && (
                  <span className="text-xs text-muted-foreground">{item.description}</span>
                )}
              </div>
              <span className="font-medium">
                {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}