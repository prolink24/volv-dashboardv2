import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/global/DateRangePicker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  Search,
  Bell,
  Settings,
  ChevronDown,
} from "lucide-react";
import { useLocation } from "wouter";
import { useTheme } from "@/providers/theme-provider";
import MobileSidebar from "./mobile-sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const pathToTitle: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard/sales": "Sales Dashboard",
  "/dashboard/setter": "Setter Dashboard",
  "/dashboard/marketing": "Marketing Dashboard",
  "/dashboard/admin": "Admin Dashboard",
  "/dashboard/compliance": "Compliance Dashboard",
  "/contacts": "Contacts",
  "/meetings": "Meetings",
  "/forms": "Forms",
  "/analytics": "Analytics",
  "/settings": "Settings",
};

const Header = () => {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      <MobileSidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)}
        currentPath={location}
      />
      
      <header className="h-16 flex items-center justify-between px-4 bg-background border-b border-border">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={toggleMobileMenu}
            aria-label="Toggle mobile menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-medium">{pathToTitle[location] || "Page"}</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <DateRangePicker />
          </div>
          
          <div className="relative w-48 lg:w-64 hidden sm:block">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search..." 
              className="pl-8 pr-3 py-1.5 rounded-md w-full" 
            />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500"></span>
            </Button>

            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>

            <ThemeToggle variant="ghost" size="icon" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="hidden md:flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <span className="font-medium text-xs">JS</span>
                  </div>
                  <span>John Smith</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
