import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Icon } from "@/components/Icon";
import { startPayuCheckout } from "@/lib/payu";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/posthog";

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}

function planHighlight(
  slug: "weekly" | "monthly" | "quarterly" | "yearly",
): string {
  switch (slug) {
    case "weekly":
      return "Dip-your-toe pass";
    case "monthly":
      return "Most popular";
    case "quarterly":
      return "Save vs monthly";
    case "yearly":
      return "Best value";
  }
}

export function Pricing() {
  const navigate = useNavigate();
  const me = useQuery(api.users.me, {});
  const plans = useQuery(api.entitlements.listPlans, {});
  const myAccess = useQuery(api.entitlements.myAccess, {});
  const createOrder = useAction(api.payments.createOrder);
  const cancelSubscription = useMutation(api.entitlements.cancelSubscription);

  const [pendingSlug, setPendingSlug] =
    useState<"weekly" | "monthly" | "quarterly" | "yearly" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subscribed = myAccess?.subscriptionActive ?? false;
  const subscriptionExpiresAt = myAccess?.subscriptionExpiresAt ?? null;

  const formattedExpiry = useMemo(() => {
    if (!subscriptionExpiresAt) return null;
    try {
      return new Date(subscriptionExpiresAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return null;
    }
  }, [subscriptionExpiresAt]);

  const handleSubscribe = async (
    slug: "weekly" | "monthly" | "quarterly" | "yearly",
  ) => {
    setError(null);
    if (!me) {
      navigate("/login");
      return;
    }
    if (!me.onboarded) {
      navigate("/onboarding");
      return;
    }
    setPendingSlug(slug);
    try {
      trackEvent("subscription_checkout_started", { plan_slug: slug });
      const { paymentUrl, fields } = await createOrder({
        productType: "subscription",
        planSlug: slug,
      });
      startPayuCheckout({
        paymentUrl,
        fields,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not start checkout.";
      setError(message);
      setPendingSlug(null);
    }
  };

  const handleCancel = async () => {
    setError(null);
    try {
      await cancelSubscription();
      trackEvent("subscription_canceled", {});
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not cancel subscription.";
      setError(message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-8 py-24">
      <div className="text-center mb-12">
        <div className="font-label text-xs uppercase tracking-widest text-primary mb-4">
          Pricing
        </div>
        <h1 className="font-headline text-5xl md:text-6xl font-bold tracking-tighter text-primary mb-6">
          Simple, transparent access.
        </h1>
        <p className="font-body text-lg text-on-surface-variant max-w-2xl mx-auto">
          Subscribe for the window you need — unlock every job, or grab a
          single role with its own one-time unlock price.
        </p>
      </div>

      {subscribed ? (
        <div className="mb-10 rounded-xl border border-primary/30 bg-primary/[0.06] p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center">
              <Icon name="verified" className="text-primary text-lg" />
            </span>
            <div>
              <div className="font-headline text-sm font-semibold text-primary">
                Your subscription is active
              </div>
              <div className="font-body text-xs text-on-surface-variant">
                {formattedExpiry
                  ? `Renews manually after ${formattedExpiry}.`
                  : "Full access to every job."}
              </div>
            </div>
          </div>
          <div className="md:ml-auto flex items-center gap-3">
            <Link
              to="/billing"
              className="inline-flex items-center gap-2 font-label text-sm px-4 py-2 rounded-lg border border-outline-variant/30 text-on-surface hover:bg-surface-container-low transition-colors"
            >
              <Icon name="receipt_long" className="text-base" />
              Billing history
            </Link>
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center gap-2 font-label text-sm px-4 py-2 rounded-lg border border-outline-variant/30 text-on-surface hover:bg-surface-container-low transition-colors"
            >
              Cancel auto-renew
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mb-8 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error flex items-start gap-3">
          <Icon name="error" className="text-base mt-0.5" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-16">
        {(plans ?? []).map((p) => {
          const isPopular = p.slug === "monthly";
          const pending = pendingSlug === p.slug;
          return (
            <div
              key={p._id}
              className={cn(
                "rounded-xl p-6 md:p-7 border border-outline-variant/20 card-gradient flex flex-col",
                isPopular && "ring-2 ring-primary",
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
                  {p.label}
                </div>
                {isPopular ? (
                  <span className="font-label text-[10px] uppercase tracking-widest text-primary bg-primary/10 border border-primary/30 rounded-full px-2 py-0.5">
                    Popular
                  </span>
                ) : null}
              </div>
              <div className="font-headline text-4xl md:text-5xl font-bold text-primary mb-1 tracking-tighter">
                {formatPrice(p.pricePaise)}
              </div>
              <div className="text-on-surface-variant text-sm mb-5">
                for {p.periodDays} days · {planHighlight(p.slug)}
              </div>
              <ul className="space-y-2 text-sm text-on-surface mb-6 flex-grow">
                <li className="flex items-center gap-2">
                  <Icon name="check" className="text-primary text-base" />
                  Unlock every published job
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="check" className="text-primary text-base" />
                  Direct apply links
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="check" className="text-primary text-base" />
                  Company details &amp; locations
                </li>
              </ul>
              <button
                type="button"
                onClick={() => handleSubscribe(p.slug)}
                disabled={pending || subscribed}
                className={cn(
                  "inline-flex items-center justify-center gap-2 font-headline font-semibold px-4 py-2.5 rounded-lg transition-colors",
                  subscribed
                    ? "bg-surface-container text-on-surface-variant cursor-not-allowed"
                    : "bg-primary text-on-primary hover:bg-primary-container disabled:opacity-70",
                )}
              >
                {pending ? (
                  <>
                    <span className="relative w-4 h-4">
                      <span className="absolute inset-0 rounded-full border border-on-primary/30" />
                      <span className="absolute inset-0 rounded-full border-t border-on-primary animate-spin" />
                    </span>
                    Starting checkout
                  </>
                ) : subscribed ? (
                  <>Already subscribed</>
                ) : (
                  <>
                    <Icon name="bolt" className="text-base" />
                    Subscribe
                  </>
                )}
              </button>
            </div>
          );
        })}
        {plans === undefined
          ? [0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl p-8 border border-outline-variant/20 h-80 animate-pulse"
              />
            ))
          : null}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-8">
          <div className="flex items-start gap-4">
            <div className="bg-surface-container-high rounded-lg p-3">
              <Icon name="bolt" className="text-primary text-2xl" />
            </div>
            <div>
              <h3 className="font-headline text-2xl text-primary mb-2">
                Secure PayU checkout
              </h3>
              <p className="text-on-surface-variant mb-2">
                All payments are processed through PayU. Your card, UPI,
                and net banking details never touch our servers.
              </p>
              <p className="text-outline text-xs font-label">
                Manual renewal. No auto-charge. Cancel anytime.
              </p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-8">
          <div className="flex items-start gap-4">
            <div className="bg-surface-container-high rounded-lg p-3">
              <Icon name="lock_open" className="text-primary text-2xl" />
            </div>
            <div>
              <h3 className="font-headline text-2xl text-primary mb-2">
                Prefer one-off unlocks?
              </h3>
              <p className="text-on-surface-variant mb-4">
                Every job listing has its own unlock price. Open any role
                from Explore and pay just for that one — valid until the
                role is archived.
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 font-label text-sm text-primary hover:opacity-70"
              >
                Browse open roles
                <Icon name="east" className="text-base" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
