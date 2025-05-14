import { Link } from "wouter";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
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
  Sliders
} from "lucide-react";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
}

const MobileSidebar = ({ isOpen, onClose, currentPath }: MobileSidebarProps) => {
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
    { icon: Settings, label: "Settings", href: "/settings" },
    { 
      icon: Sliders, 
      label: "KPI Configuration", 
      href: "/settings/kpi-configuration",
      indent: true 
    },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="p-0 w-[250px]">
        <SheetHeader className="h-16 flex items-center justify-start px-4 border-b border-border">
          <SheetTitle className="flex items-center">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
              <Link2 className="h-5 w-5" />
            </div>
            <span className="ml-3 text-lg font-semibold">ContactSync</span>
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col p-4 gap-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.href;
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={onClose}
              >
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={`w-full justify-start ${item.indent ? "pl-8" : "px-4"}`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>
        
        <div className="p-4 mt-auto border-t border-border">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <span className="font-medium text-sm">JS</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">John Smith</p>
              <p className="text-xs text-muted-foreground">Admin</p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileSidebar;