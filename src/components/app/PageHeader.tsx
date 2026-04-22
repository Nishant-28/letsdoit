import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-end md:justify-between gap-6 pb-8 border-b border-outline-variant/15",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <div className="font-label text-[11px] uppercase tracking-[0.3em] text-outline-variant mb-3">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tighter text-primary">
          {title}
        </h1>
        {description ? (
          <p className="font-body text-base md:text-lg text-on-surface-variant mt-3 max-w-2xl">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-3">{actions}</div>
      ) : null}
    </div>
  );
}
