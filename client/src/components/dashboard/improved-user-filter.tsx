import React from 'react';
import { Check, ChevronsUpDown, User } from 'lucide-react';
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
import { SalesTeamMember } from '@/hooks/use-dashboard-data';

interface ImprovedUserFilterProps {
  users: SalesTeamMember[];
  selectedUserId?: string;
  onSelectUser: (userId: string | undefined) => void;
}

/**
 * User Filter Component
 * 
 * Allows filtering dashboard data by team member
 */
export function ImprovedUserFilter({
  users,
  selectedUserId,
  onSelectUser
}: ImprovedUserFilterProps) {
  const [open, setOpen] = React.useState(false);
  
  // Find the selected user object
  const selectedUser = users.find(user => user.userId === selectedUserId);
  
  // Clear the selected user
  const handleClearUser = () => {
    onSelectUser(undefined);
    setOpen(false);
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedUser ? (
            <span className="flex items-center">
              <User className="mr-2 h-4 w-4" />
              {selectedUser.name}
            </span>
          ) : (
            <span className="flex items-center">
              <User className="mr-2 h-4 w-4" />
              All Team Members
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search team member..." />
          <CommandEmpty>No team member found.</CommandEmpty>
          <CommandGroup>
            <CommandItem
              onSelect={handleClearUser}
              className="text-sm"
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  !selectedUserId ? "opacity-100" : "opacity-0"
                )}
              />
              All Team Members
            </CommandItem>
            {users.map((user) => (
              <CommandItem
                key={user.userId}
                onSelect={() => {
                  onSelectUser(user.userId);
                  setOpen(false);
                }}
                className="text-sm"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    user.userId === selectedUserId ? "opacity-100" : "opacity-0"
                  )}
                />
                {user.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}