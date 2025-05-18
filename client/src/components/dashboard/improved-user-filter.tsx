import React from 'react';
import { cn } from '@/lib/utils';
import { useDashboard } from '@/providers/dashboard-provider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { UserIcon } from 'lucide-react';

export interface ImprovedUserFilterProps {
  className?: string;
}

export function ImprovedUserFilter({ className }: ImprovedUserFilterProps) {
  const { dashboardData, selectedUserId, setSelectedUserId, isLoading } = useDashboard();
  
  // Get the list of users from the dashboard data
  const salesTeam = dashboardData?.salesTeam || [];
  
  // Handle user selection
  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId === 'all' ? undefined : userId);
  };
  
  return (
    <div className={cn('flex flex-col space-y-2', className)}>
      <div className="flex items-center space-x-2">
        <UserIcon className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium text-muted-foreground">Filter by team member</Label>
      </div>
      
      <Select
        value={selectedUserId || 'all'}
        onValueChange={handleUserSelect}
        disabled={isLoading || salesTeam.length === 0}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="All team members" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All team members</SelectItem>
          
          {salesTeam.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.name} ({user.role})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}