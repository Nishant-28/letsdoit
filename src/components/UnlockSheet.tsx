import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

function formatPrice(paise: number): string {
  return `$${(paise / 100).toFixed(0)}`;
}

export function UnlockSheet({
  open,
  onClose,
  jobId,
  jobTitle,
  unlockPricePaise,
}: {
  open: boolean;
  onClose: () => void;
  jobId: Id<"jobs">;
  jobTitle: string;
  unlockPricePaise: number;
}) {
  const plans = useQuery(api.entitlements.listPlans, {});
  const unlockJob = useMutation(api.entitlements.mockUnlockJob);
  const subscribe = useMutation(api.entitlements.mockSubscribe);
  const [busy, setBusy] = useState<string | null>(null);

  if (!open) return null;

  const handleUnlock = async () => {
    setBusy("role");
    try {
      await unlockJob({ jobId });
      onClose();
    } finally {
      setBusy(null);
    }
  };

  const handleSubscribe = async (slug: "weekly" | "monthly" | "yearly") => {
    setBusy(slug);
    try {
      await subscribe({ planSlug: slug });
      onClose();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-surface-container rounded-xl border border-outline-variant/20 p-8 relative card-gradient"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant"
          aria-label="Close"
        >
          <Icon name="close" />
        </button>

        <div className="mb-2 text-on-surface-variant font-label uppercase tracking-widest text-xs">
          Unlock
        </div>
        <h2 className="font-headline text-3xl text-primary font-bold mb-2">
          {jobTitle}
        </h2>
        <p className="text-on-surface-variant mb-8">
          Pick how you'd like to access this role's company, location and apply
          link.
        </p>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <button
            type="button"
            onClick={handleUnlock}
            disabled={busy !== null}
            className={cn(
              "text-left p-6 rounded-xl border border-primary bg-primary text-on-primary hover:opacity-90 transition disabled:opacity-50",
            )}
          >
            <div className="font-label text-xs uppercase tracking-widest opacity-70 mb-1">
              One Role
            </div>
            <div className="font-headline text-3xl font-bold mb-2">
              {formatPrice(unlockPricePaise)}
            </div>
            <p className="text-sm opacity-80">
              Unlock just this role. Lifetime access to its details &amp; apply
              link.
            </p>
            {busy === "role" ? (
              <div className="mt-3 text-sm font-label">Processing…</div>
            ) : null}
          </button>

          <div className="p-6 rounded-xl border border-outline-variant/30 bg-surface-container-low">
            <div className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-3">
              All Roles — Subscription
            </div>
            <div className="space-y-2">
              {(plans ?? []).map((p) => (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => handleSubscribe(p.slug)}
                  disabled={busy !== null}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface transition disabled:opacity-50"
                >
                  <span className="font-headline">{p.label}</span>
                  <span className="font-label text-sm flex items-center gap-2">
                    {formatPrice(p.pricePaise)}
                    {busy === p.slug ? (
                      <Icon name="progress_activity" className="text-sm animate-spin" />
                    ) : (
                      <Icon name="arrow_forward" className="text-sm" />
                    )}
                  </span>
                </button>
              ))}
              {plans === undefined ? (
                <div className="text-sm text-on-surface-variant">Loading…</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="text-xs text-outline font-label">
          Mock checkout for development. Real Cashfree integration ships in
          phase 3.
        </div>
      </div>
    </div>
  );
}
