import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}

export function Pricing() {
  const plans = useQuery(api.entitlements.listPlans, {});

  return (
    <div className="max-w-6xl mx-auto px-8 py-24">
      <div className="text-center mb-16">
        <div className="font-label text-xs uppercase tracking-widest text-primary mb-4">
          Pricing
        </div>
        <h1 className="font-headline text-5xl md:text-6xl font-bold tracking-tighter text-primary mb-6">
          Simple, transparent access.
        </h1>
        <p className="font-body text-lg text-on-surface-variant max-w-2xl mx-auto">
          Choose a plan that fits your needs. Get access to premium job listings
          and exclusive features.
        </p>
      </div>

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
              for {p.periodDays} days · illustrative tiers
            </div>
            <ul className="space-y-2 text-sm text-on-surface mb-8 flex-grow">
              <li className="flex items-center gap-2">
                <Icon name="check" className="text-primary text-base" />
                Full listings on Explore
              </li>
              <li className="flex items-center gap-2">
                <Icon name="check" className="text-primary text-base" />
                Direct apply links
              </li>
              <li className="flex items-center gap-2">
                <Icon name="check" className="text-primary text-base" />
                Premium support
              </li>
            </ul>
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
              Secure Payments
            </h3>
            <p className="text-on-surface-variant mb-2">
              All payments are processed securely. Subscribe to unlock premium
              features and get access to exclusive job listings.
            </p>
            <p className="text-outline text-xs font-label">
              Cancel anytime. No hidden fees.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
