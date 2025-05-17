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
  Link2,
  DollarSign,
  Phone,
  LineChart,
  ShieldCheck,
  ClipboardCheck,
  Gauge,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Menu,
  Database
} from "lucide-react";

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
  isActive: boolean;
  isCollapsed: boolean;
  indent?: boolean;
}

const SidebarItem = ({ icon: Icon, label, href, isActive, isCollapsed, indent }: SidebarItemProps) => {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Link href={href}>
          <Button
            variant={isActive ? "default" : "ghost"}
            size="sm"
            className={cn(
              "w-full justify-start",
              isCollapsed ? "px-2" : indent ? "pl-8" : "px-4",
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
  
  // Initialize with localStorage value if available, otherwise default to false
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true' ? true : false;
  });
  
  // Save to localStorage whenever state changes
  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  const sidebarItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/" },
    { 
      icon: DollarSign, 
      label: "Sales Dashboard", 
      href: "/dashboard/sales",
      indent: true 
    },
    { 
      icon: Phone, 
      label: "Setter Dashboard", 
      href: "/dashboard/setter",
      indent: true 
    },
    { 
      icon: LineChart, 
      label: "Marketing Dashboard", 
      href: "/dashboard/marketing",
      indent: true 
    },
    { 
      icon: ClipboardCheck, 
      label: "Admin Dashboard", 
      href: "/dashboard/admin",
      indent: true 
    },
    { 
      icon: ShieldCheck, 
      label: "Compliance Dashboard",
      href: "/dashboard/compliance",
      indent: true 
    },
    { icon: Users, label: "Contacts", href: "/contacts" },
    { icon: Calendar, label: "Meetings", href: "/meetings" },
    { icon: FileText, label: "Forms", href: "/forms" },
    { icon: BarChart2, label: "Analytics", href: "/analytics" },
    { icon: Database, label: "Database Health", href: "/database-health" },
    { icon: Settings, label: "Settings", href: "/settings" },
    { 
      icon: Sliders, 
      label: "KPI Configuration", 
      href: "/settings/kpi-configuration",
      indent: true 
    },
  ];

  return (
    <div
      className={cn(
        "hidden md:flex flex-col border-r border-border bg-background transition-all duration-300 ease-in-out z-10",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
            <Link2 className="h-5 w-5" />
          </div>
          {!isCollapsed && <span className="ml-3 text-lg font-semibold">Volv</span>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggleSidebar}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
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
            indent={item.indent}
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
