export function FullPageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="hero-gradient min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border border-outline-variant/30" />
          <div className="absolute inset-0 rounded-full border-t border-primary animate-spin" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-headline text-base font-semibold text-primary">
            {label}
          </span>
          <span className="font-label text-[10px] uppercase tracking-[0.25em] text-outline-variant">
            One moment
          </span>
        </div>
      </div>
    </div>
  );
}
