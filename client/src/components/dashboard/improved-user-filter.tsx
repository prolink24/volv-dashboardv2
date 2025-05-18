import React, { useState } from 'react';
import { CheckIcon, ChevronsUpDown, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useDashboard } from '@/providers/dashboard-provider';

// This component will be populated with real user data from the dashboard context
export function ImprovedUserFilter() {
  const [open, setOpen] = useState(false);
  const { dashboardData, selectedUserId, setSelectedUserId, isLoading } = useDashboard();
  
  // Get users from the dashboard data if available
  const users = dashboardData?.salesTeam || [];
  
  // Find the currently selected user
  const selectedUser = users.find(user => user.id === selectedUserId);
  
  // Handle selecting all users (no specific user filter)
  const handleSelectAllUsers = () => {
    setSelectedUserId(undefined);
    setOpen(false);
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between w-full sm:w-[220px]"
          disabled={isLoading}
        >
          <div className="flex items-center gap-2 truncate">
            <User className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {selectedUser ? selectedUser.name : "All Team Members"}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[220px]">
        <Command>
          <CommandInput placeholder="Search team member..." />
          <CommandEmpty>No team member found.</CommandEmpty>
          <CommandGroup>
            <CommandItem
              onSelect={handleSelectAllUsers}
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              <span>All Team Members</span>
              {!selectedUserId && <CheckIcon className="ml-auto h-4 w-4" />}
            </CommandItem>
            
            {users.map((user) => (
              <CommandItem
                key={user.id}
                onSelect={() => {
                  setSelectedUserId(user.id);
                  setOpen(false);
                }}
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                <span>{user.name}</span>
                {selectedUserId === user.id && (
                  <CheckIcon className="ml-auto h-4 w-4" />
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}