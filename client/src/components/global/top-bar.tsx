import { useState } from "react";
import { Link, useLocation } from "wouter";
import { DateRangePicker } from "./date-range-picker";
import { Menu, X, BarChart2, Users, Activity, FileText } from "lucide-react";

/**
 * Global top navigation bar that includes date range picker and site navigation
 */
export function GlobalTopBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [location] = useLocation();
  
  // Navigation items for the application
  const navItems = [
    { label: "Dashboard", href: "/", icon: BarChart2 },
    { label: "Team", href: "/team", icon: Users },
    { label: "Analytics", href: "/analytics", icon: Activity },
    { label: "Reports", href: "/reports", icon: FileText },
  ];
  
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link to="/">
            <h1 className="text-xl font-bold">CRM Analytics</h1>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              
              return (
                <Link 
                  key={item.href} 
                  to={item.href}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                    isActive 
                      ? "text-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <DateRangePicker />
          </div>
          
          <button
            className="inline-flex md:hidden items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span className="sr-only">Toggle menu</span>
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="container md:hidden py-4 px-4 border-t">
          <nav className="flex flex-col gap-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              
              return (
                <Link 
                  key={item.href} 
                  to={item.href}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                    isActive 
                      ? "text-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}