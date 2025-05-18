import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, User, Users } from 'lucide-react';
import { useDashboard } from '@/providers/dashboard-provider';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export interface ImprovedUserFilterProps {
  className?: string;
}

export function ImprovedUserFilter({ className }: ImprovedUserFilterProps) {
  const { 
    dashboardData, 
    selectedUserId, 
    setSelectedUserId, 
    isLoading
  } = useDashboard();
  
  const [open, setOpen] = useState(false);
  
  // Get list of users from dashboard data
  const userList = dashboardData?.salesTeam || [];
  
  // Find the selected user from the list
  const selectedUser = userList.find(user => user.id === selectedUserId);
  
  // Handle user selection
  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId === 'all' ? undefined : userId);
    setOpen(false);
  };
  
  // Clear the selected user filter
  const handleClear = () => {
    setSelectedUserId(undefined);
    setOpen(false);
  };
  
  return (
    <div className={cn('relative', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className={cn(
              'justify-between min-w-[180px] h-9 px-3 py-2',
              open && 'border-primary'
            )}
            disabled={isLoading}
          >
            <div className="flex items-center gap-2 truncate">
              {selectedUser ? (
                <>
                  <User className="h-4 w-4" />
                  <span className="truncate">{selectedUser.name}</span>
                </>
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  <span>All Users</span>
                </>
              )}
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-[220px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search users..." />
            <CommandList>
              <CommandEmpty>No users found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  key="all-users"
                  value="all"
                  onSelect={() => handleUserSelect('all')}
                  className="flex items-center gap-2"
                >
                  <div className="flex h-5 w-5 items-center justify-center">
                    {!selectedUserId && <Check className="h-4 w-4" />}
                  </div>
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>All Users</span>
                </CommandItem>
                
                {isLoading ? (
                  // Show skeletons while loading
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))
                ) : (
                  // Show users from the list
                  userList.map((user) => (
                    <CommandItem
                      key={user.id}
                      value={user.id}
                      onSelect={() => handleUserSelect(user.id)}
                      className="flex items-center gap-2"
                    >
                      <div className="flex h-5 w-5 items-center justify-center">
                        {selectedUserId === user.id && <Check className="h-4 w-4" />}
                      </div>
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{user.name}</span>
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
            </CommandList>
          </Command>
          
          {selectedUserId && (
            <div className="border-t p-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start text-sm"
                onClick={handleClear}
              >
                Clear filter
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      
      {selectedUserId && (
        <Badge
          variant="secondary"
          className="absolute -top-3 -right-3 px-1.5 py-0.5"
        >
          1
        </Badge>
      )}
    </div>
  );
}