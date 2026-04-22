import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

export function StatCard({
  icon,
  label,
  value,
  hint,
  tone = "default",
  className,
}: {
  icon: string;
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "accent" | "warning";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-6 flex flex-col gap-5 hover:bg-surface-container-low transition-colors",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="font-label text-[10px] uppercase tracking-[0.28em] text-outline-variant">
          {label}
        </div>
        <span
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center border",
            tone === "accent" &&
              "bg-primary/10 border-primary/30 text-primary",
            tone === "warning" &&
              "bg-amber-500/10 border-amber-500/30 text-amber-400",
            tone === "default" &&
              "bg-surface-container border-outline-variant/20 text-on-surface-variant",
          )}
        >
          <Icon name={icon} className="text-lg" />
        </span>
      </div>
      <div className="font-headline text-3xl md:text-4xl font-bold tracking-tighter text-primary tabular-nums">
        {value}
      </div>
      {hint ? (
        <div className="font-body text-xs text-on-surface-variant">{hint}</div>
      ) : null}
    </div>
  );
}
