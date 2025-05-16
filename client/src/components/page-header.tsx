import { cn } from "@/lib/utils";

interface PageHeaderProps {
  heading: string;
  subheading?: string;
  className?: string;
}

export function PageHeader({
  heading,
  subheading,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <h1 className="text-3xl font-bold tracking-tight">{heading}</h1>
      {subheading && (
        <p className="text-muted-foreground">
          {subheading}
        </p>
      )}
    </div>
  );
}