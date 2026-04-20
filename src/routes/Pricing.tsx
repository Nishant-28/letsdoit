import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

function formatPrice(paise: number): string {
  return `$${(paise / 100).toFixed(0)}`;
}

export function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const plans = useQuery(api.entitlements.listPlans, {});
  const access = useQuery(api.entitlements.myAccess, {});
  const subscribe = useMutation(api.entitlements.mockSubscribe);
  const [busy, setBusy] = useState<string | null>(null);

  const handleSubscribe = async (slug: "weekly" | "monthly" | "yearly") => {
    if (!user) {
      navigate("/login", { state: { from: "/pricing" } });
      return;
    }
    setBusy(slug);
    try {
      await subscribe({ planSlug: slug });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-8 py-24">
      <div className="text-center mb-16">
        <div className="font-label text-xs uppercase tracking-widest text-primary mb-4">
          Pricing
        </div>
        <h1 className="font-headline text-5xl md:text-6xl font-bold tracking-tighter text-primary mb-6">
          Pay for what you need.
        </h1>
        <p className="font-body text-lg text-on-surface-variant max-w-2xl mx-auto">
          Job titles are free. Company names, locations, descriptions and apply
          links are gated. Unlock a single role for{" "}
          <span className="text-primary font-semibold">$9</span> or open every
          listing with a subscription.
        </p>
      </div>

      {access?.subscriptionActive ? (
        <div className="mb-12 bg-primary/10 border border-primary/40 rounded-xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="verified" className="text-primary" />
            <div>
              <div className="font-headline text-primary">
                Subscription active
              </div>
              <div className="text-on-surface-variant text-sm">
                {access.subscriptionExpiresAt
                  ? `Renews / expires ${new Date(access.subscriptionExpiresAt).toLocaleDateString()}`
                  : "All listings unlocked."}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid md:grid-cols-3 gap-6 mb-16">
        {(plans ?? []).map((p) => (
          <div
            key={p._id}
            className={cn(
              "rounded-xl p-8 border border-outline-variant/20 card-gradient flex flex-col",
              p.slug === "monthly" && "ring-2 ring-primary",
            )}
          >
            <div className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-2">
              {p.label}
            </div>
            <div className="font-headline text-5xl font-bold text-primary mb-1">
              {formatPrice(p.pricePaise)}
            </div>
            <div className="text-on-surface-variant text-sm mb-6">
              for {p.periodDays} days · all roles unlocked
            </div>
            <ul className="space-y-2 text-sm text-on-surface mb-8 flex-grow">
              <li className="flex items-center gap-2">
                <Icon name="check" className="text-primary text-base" />
                Unlock every published role
              </li>
              <li className="flex items-center gap-2">
                <Icon name="check" className="text-primary text-base" />
                Direct apply links
              </li>
              <li className="flex items-center gap-2">
                <Icon name="check" className="text-primary text-base" />
                Tracker board
              </li>
            </ul>
            <button
              type="button"
              onClick={() => handleSubscribe(p.slug)}
              disabled={busy !== null}
              className={cn(
                "w-full py-3 rounded-md font-headline font-semibold transition-colors",
                p.slug === "monthly"
                  ? "bg-primary text-on-primary hover:bg-primary-container"
                  : "bg-surface-container-high text-on-surface hover:bg-surface-container-highest",
                busy !== null && "opacity-50",
              )}
            >
              {busy === p.slug
                ? "Processing…"
                : user
                  ? "Subscribe"
                  : "Sign in to subscribe"}
            </button>
          </div>
        ))}
        {plans === undefined
          ? [0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-xl p-8 border border-outline-variant/20 h-80 animate-pulse"
              />
            ))
          : null}
      </div>

      <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-8">
        <div className="flex items-start gap-4">
          <div className="bg-surface-container-high rounded-lg p-3">
            <Icon name="bolt" className="text-primary text-2xl" />
          </div>
          <div>
            <h3 className="font-headline text-2xl text-primary mb-2">
              Just want one role?
            </h3>
            <p className="text-on-surface-variant mb-2">
              No subscription required. Tap any locked role on{" "}
              <span className="text-primary">Explore</span> and choose{" "}
              <span className="text-primary">Unlock this role $9</span>.
            </p>
            <p className="text-outline text-xs font-label">
              Mock checkout for development. Real Cashfree integration ships in
              phase 3.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
