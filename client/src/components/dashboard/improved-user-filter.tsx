import React, { useState } from 'react';
import { Check, ChevronsUpDown, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDashboard } from "@/providers/dashboard-provider";
import { cn } from "@/lib/utils";

/**
 * Improved user filter component for dashboard
 */
export function ImprovedUserFilter() {
  const { selectedUserId, setSelectedUserId, data, isLoading } = useDashboard();
  const [open, setOpen] = useState(false);
  
  // Get sales team from dashboard data
  const salesTeam = data?.salesTeam || [];
  
  const userOptions = [
    { id: '', name: 'All Users' },
    ...salesTeam.map(user => ({
      id: String(user.id),
      name: user.name
    }))
  ];
  
  // Get the selected user name
  const selectedUserName = selectedUserId 
    ? userOptions.find(user => user.id === selectedUserId)?.name || 'Unknown User'
    : 'All Users';
  
  const handleSelect = (userId: string) => {
    setSelectedUserId(userId ? userId : null);
    setOpen(false);
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
          disabled={isLoading}
        >
          <div className="flex items-center gap-2 truncate">
            <Users className="h-4 w-4" />
            <span className="truncate">{selectedUserName}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search user..." />
          <CommandEmpty>No user found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {userOptions.map(user => (
                <CommandItem
                  key={user.id}
                  value={user.name}
                  onSelect={() => handleSelect(user.id)}
                  className="flex items-center gap-2"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      (selectedUserId === user.id || (!selectedUserId && user.id === '')) 
                        ? "opacity-100" 
                        : "opacity-0"
                    )}
                  />
                  {user.name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}