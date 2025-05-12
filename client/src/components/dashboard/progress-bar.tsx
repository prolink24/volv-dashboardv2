import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  className?: string;
  height?: string;
}

const ProgressBar = ({ 
  value, 
  max, 
  color = "bg-primary", 
  className,
  height = "h-2"
}: ProgressBarProps) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  
  return (
    <div className={cn("w-full bg-muted rounded-full", height, className)}>
      <div 
        className={cn(`${color} rounded-full`, height)} 
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export default ProgressBar;
