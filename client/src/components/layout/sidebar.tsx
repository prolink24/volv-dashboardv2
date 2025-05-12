import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  BarChart2, 
  Settings,
  Link2
} from "lucide-react";

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
  isActive: boolean;
  isCollapsed: boolean;
}

const SidebarItem = ({ icon: Icon, label, href, isActive, isCollapsed }: SidebarItemProps) => {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Link href={href}>
          <Button
            variant={isActive ? "default" : "ghost"}
            size="sm"
            className={cn(
              "w-full justify-start",
              isCollapsed ? "px-2" : "px-4",
              isActive && "bg-primary text-primary-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5", isCollapsed ? "mr-0" : "mr-2")} />
            {!isCollapsed && <span>{label}</span>}
          </Button>
        </Link>
      </TooltipTrigger>
      {isCollapsed && (
        <TooltipContent side="right">
          {label}
        </TooltipContent>
      )}
    </Tooltip>
  );
};

const Sidebar = () => {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Users, label: "Contacts", href: "/contacts" },
    { icon: Calendar, label: "Meetings", href: "/meetings" },
    { icon: FileText, label: "Forms", href: "/forms" },
    { icon: BarChart2, label: "Analytics", href: "/analytics" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  return (
    <div
      className={cn(
        "hidden md:flex flex-col border-r border-border bg-background transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border">
        <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
          <Link2 className="h-5 w-5" />
        </div>
        {!isCollapsed && <span className="ml-3 text-lg font-semibold">ContactSync</span>}
      </div>
      
      {/* Navigation */}
      <div className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {sidebarItems.map((item) => (
          <SidebarItem
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
            isActive={location === item.href}
            isCollapsed={isCollapsed}
          />
        ))}
      </div>
      
      {/* User */}
      <div className="p-3 mt-auto border-t border-border">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <span className="font-medium text-sm">JS</span>
          </div>
          {!isCollapsed && (
            <div className="ml-3">
              <p className="text-sm font-medium">John Smith</p>
              <p className="text-xs text-muted-foreground">Admin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
