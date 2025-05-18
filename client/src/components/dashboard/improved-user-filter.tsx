import { useState, useEffect } from "react";
import { useDashboard } from "@/providers/dashboard-provider";
import { Check, ChevronsUpDown, UserIcon } from "lucide-react";
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
import { cn } from "@/lib/utils";

// Default user options, customize based on your data
const defaultUserOptions = [
  "All Users",
  "Josh Sweetnam",
  "Mazin Gazar",
  "Bryann Cabral",
  "Bogdan Micov",
  "Harlan Ryder",
];

interface ImprovedUserFilterProps {
  userOptions?: string[];
  className?: string;
  onUserChange?: (user: string) => void;
}

export function ImprovedUserFilter({
  userOptions = defaultUserOptions,
  className,
  onUserChange
}: ImprovedUserFilterProps) {
  const { userFilter, setUserFilter } = useDashboard();
  const [open, setOpen] = useState(false);

  const handleValueChange = (value: string) => {
    setUserFilter(value);
    if (onUserChange) {
      onUserChange(value);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[200px] justify-between", className)}
        >
          <div className="flex items-center gap-2 truncate">
            <UserIcon className="h-4 w-4 shrink-0 opacity-50" />
            <span className="truncate">{userFilter || "All Users"}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search users..." />
          <CommandEmpty>No user found.</CommandEmpty>
          <CommandGroup>
            {userOptions.map((user) => (
              <CommandItem
                key={user}
                value={user}
                onSelect={() => handleValueChange(user)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    userFilter === user ? "opacity-100" : "opacity-0"
                  )}
                />
                {user}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default ImprovedUserFilter;