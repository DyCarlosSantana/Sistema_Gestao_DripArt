import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  subtitle?: string;
  subtitleColor?: "success" | "warning" | "coral" | "muted";
  icon: LucideIcon;
  gradient?: string;
}

export function MetricCard({ label, value, subtitle, subtitleColor = "muted", icon: Icon, gradient }: MetricCardProps) {
  const subtitleColors = {
    success: "text-success",
    warning: "text-warning",
    coral: "text-coral",
    muted: "text-muted-foreground",
  };

  // Gradient bottom border color based on gradient prop
  const borderGradientMap: Record<string, string> = {
    "bg-gradient-brand": "from-primary to-primary/60",
    "bg-gradient-cool": "from-cyan to-info",
    "bg-gradient-warm": "from-gold to-primary",
  };
  const bottomGrad = gradient ? borderGradientMap[gradient] : null;

  return (
    <div className="group relative rounded-2xl border border-border bg-card p-5 shadow-subtle transition-all duration-300 hover:shadow-card hover:-translate-y-1 overflow-hidden">
      {/* Gradient bottom accent bar */}
      {bottomGrad && (
        <div className={cn(
          "absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300",
          bottomGrad
        )} />
      )}

      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground">{value}</p>
          {subtitle && (
            <p className={cn("mt-1.5 text-[11px] font-medium", subtitleColors[subtitleColor])}>{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-md",
          gradient || "bg-secondary"
        )}>
          <Icon className={cn("h-5 w-5", gradient ? "text-primary-foreground" : "text-muted-foreground")} />
        </div>
      </div>
    </div>
  );
}
