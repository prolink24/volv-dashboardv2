import React, { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/providers/dashboard-provider";
import { cn } from "@/lib/utils";

interface UserOption {
  value: string;
  label: string;
}

interface ImprovedUserFilterProps {
  users: UserOption[];
  isLoading?: boolean;
  onFilterChange?: (userId: string) => void;
  className?: string;
}

export function ImprovedUserFilter({
  users,
  isLoading = false,
  onFilterChange,
  className = "",
}: ImprovedUserFilterProps) {
  const { userFilter, setUserFilter } = useDashboard();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<UserOption[]>([]);

  // Initialize options with All Users option and provided users
  useEffect(() => {
    if (users && users.length > 0) {
      setOptions([
        { value: "All Users", label: "All Users" },
        ...users
      ]);
    }
  }, [users]);

  // Get the display label for current user filter
  const getCurrentUserLabel = () => {
    if (userFilter === "All Users") return "All Users";
    
    const selectedUser = options.find(user => user.value === userFilter);
    return selectedUser ? selectedUser.label : "All Users";
  };

  // Handle user selection
  const handleUserSelect = (userId: string) => {
    setUserFilter(userId);
    setOpen(false);
    
    if (onFilterChange) {
      onFilterChange(userId);
    }
  };

  if (isLoading) {
    return (
      <div className={className}>
        <Skeleton className="h-9 w-[180px]" />
      </div>
    );
  }

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[180px] justify-between"
          >
            <div className="flex items-center">
              <Users className="mr-2 h-4 w-4" />
              <span className="truncate">{getCurrentUserLabel()}</span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[180px] p-0">
          <Command>
            <CommandInput placeholder="Search users..." />
            <CommandEmpty>No user found.</CommandEmpty>
            <CommandGroup>
              {options.map((user) => (
                <CommandItem
                  key={user.value}
                  value={user.value}
                  onSelect={handleUserSelect}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      userFilter === user.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{user.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}