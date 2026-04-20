import { cn } from "@/lib/utils";

export function Icon({
  name,
  className,
  filled,
}: {
  name: string;
  className?: string;
  filled?: boolean;
}) {
  return (
    <span
      className={cn("material-symbols-outlined leading-none", className)}
      style={
        filled
          ? { fontVariationSettings: "'FILL' 1" }
          : { fontVariationSettings: "'FILL' 0" }
      }
    >
      {name}
    </span>
  );
}
