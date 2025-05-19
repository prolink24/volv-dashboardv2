import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ThemeToggleProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
  showLabel?: boolean;
}

export function ThemeToggle({ 
  variant = "outline", 
  size = "default", 
  showLabel = false 
}: ThemeToggleProps) {
  const { setTheme, theme } = useTheme();

  const toggleTheme = () => {
    if (theme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={toggleTheme}
            className="gap-2 relative"
            aria-label="Toggle theme"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            {showLabel && <span className="ml-2">{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Switch to {theme === "dark" ? "light" : "dark"} mode</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}