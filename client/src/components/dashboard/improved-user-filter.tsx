import React from 'react';
import { Check, ChevronDown, ChevronsUpDown, User } from 'lucide-react';
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
import { cn } from '@/lib/utils';

export function ImprovedUserFilter() {
  const { currentPeriod, selectedUserId, setSelectedUserId, isLoading } = useDashboard();
  const [open, setOpen] = React.useState(false);
  
  // Extract sales team members from current period data
  const users = currentPeriod.salesTeam.map(member => ({
    id: member.id,
    name: member.name,
    role: member.role
  }));
  
  // Add "All Users" option
  const allUsers = [
    { id: null, name: 'All Users', role: '' },
    ...users
  ];
  
  // Find the currently selected user
  const selectedUser = selectedUserId 
    ? allUsers.find(user => user.id === selectedUserId) 
    : allUsers[0];
    
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between md:w-[200px]"
          disabled={isLoading}
        >
          <div className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            {selectedUser?.name || "Select User"}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search users..." />
          <CommandEmpty>No user found.</CommandEmpty>
          <CommandGroup>
            {allUsers.map((user) => (
              <CommandItem
                key={user.id || 'all'}
                value={user.name}
                onSelect={() => {
                  setSelectedUserId(user.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedUserId === user.id ? "opacity-100" : "opacity-0"
                  )}
                />
                {user.name}
                {user.role && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({user.role})
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}