import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, User } from "lucide-react";
import { useDashboard } from '@/providers/dashboard-provider';
import { SalesTeamMember } from '@/hooks/use-dashboard-data';
import { cn } from '@/lib/utils';

/**
 * Improved User Filter Component
 * 
 * Allows filtering dashboard data by specific sales team member
 */
export function ImprovedUserFilter() {
  const { salesTeam, selectedUserId, setSelectedUserId } = useDashboard();
  const [open, setOpen] = useState(false);
  
  // Get the selected user's name for display
  const selectedUser = salesTeam?.find(user => user.id === selectedUserId);
  
  return (
    <div className="w-full max-w-[280px]">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedUserId && selectedUser
              ? <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{selectedUser.name}</span>
                </div>
              : <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>All Team Members</span>
                </div>
            }
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search team member..." />
            <CommandEmpty>No team member found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setSelectedUserId(null);
                  setOpen(false);
                }}
                className="cursor-pointer"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    !selectedUserId ? "opacity-100" : "opacity-0"
                  )}
                />
                All Team Members
              </CommandItem>
              
              {salesTeam && salesTeam.map((user) => (
                <CommandItem
                  key={user.id}
                  onSelect={() => {
                    setSelectedUserId(user.id);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedUserId === user.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {user.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}