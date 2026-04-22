import { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/app/PageHeader";
import { FullPageLoader } from "@/components/auth/FullPageLoader";
import { cn } from "@/lib/utils";

type OrderStatus =
  | "created"
  | "payment_pending"
  | "paid"
  | "failed"
  | "canceled"
  | "refunded";

const statusTone: Record<
  OrderStatus,
  "neutral" | "active" | "good" | "bad" | "muted"
> = {
  created: "neutral",
  payment_pending: "active",
  paid: "good",
  failed: "bad",
  canceled: "muted",
  refunded: "muted",
};

const statusLabel: Record<OrderStatus, string> = {
  created: "Starting",
  payment_pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  canceled: "Canceled",
  refunded: "Refunded",
};

function formatPaise(paise: number, currency: string): string {
  const symbol = currency === "INR" ? "₹" : currency;
  return `${symbol}${(paise / 100).toFixed(0)}`;
}

function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return new Date(ts).toISOString();
  }
}

export function Billing() {
  const navigate = useNavigate();
  const me = useQuery(api.users.me, {});
  const access = useQuery(api.entitlements.myAccess, {});
  const orders = useQuery(api.paymentOrders.myOrders, { limit: 50 });
  const entitlements = useQuery(api.entitlements.listMine, {});

  useEffect(() => {
    if (me === null) navigate("/callback", { replace: true });
  }, [me, navigate]);

  if (me === undefined || orders === undefined || access === undefined) {
    return <FullPageLoader label="Loading billing history" />;
  }
  if (me === null) {
    return <FullPageLoader label="Preparing your account" />;
  }

  const subscriptionExpiresAt = access?.subscriptionExpiresAt ?? null;
  const formattedExpiry = subscriptionExpiresAt
    ? new Date(subscriptionExpiresAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div>
      <div className="max-w-5xl mx-auto px-6 md:px-8 py-10 md:py-14 space-y-10">
        <PageHeader
          eyebrow="Account"
          title="Billing & orders"
          description="Every Cashfree order you've started, with the live status and any access granted."
          actions={
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 bg-primary text-on-primary font-headline font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-container transition-colors"
            >
              <Icon name="add_shopping_cart" className="text-base" />
              Buy a plan
            </Link>
          }
        />

        <section className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-6">
          <div className="font-label text-[10px] uppercase tracking-[0.28em] text-outline-variant mb-3">
            Access summary
          </div>
          {access?.subscriptionActive ? (
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                <Icon name="verified" className="text-primary text-lg" />
              </span>
              <div>
                <div className="font-headline text-base font-semibold text-primary">
                  Subscription active
                </div>
                <div className="font-body text-sm text-on-surface-variant">
                  {formattedExpiry
                    ? `Expires ${formattedExpiry}. Manual renewal — no auto-charge.`
                    : "Full access to every published job."}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center">
                <Icon name="lock" className="text-on-surface-variant text-lg" />
              </span>
              <div>
                <div className="font-headline text-base font-semibold text-primary">
                  No active subscription
                </div>
                <div className="font-body text-sm text-on-surface-variant">
                  {(access?.unlockedJobIds.length ?? 0) > 0
                    ? `${access?.unlockedJobIds.length} job unlock${access!.unlockedJobIds.length === 1 ? "" : "s"} active.`
                    : "Unlock individual jobs or subscribe for full access."}
                </div>
              </div>
            </div>
          )}
        </section>

        <section>
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <div className="font-label text-[10px] uppercase tracking-[0.28em] text-outline-variant mb-2">
                Transactions
              </div>
              <h2 className="font-headline text-xl md:text-2xl font-bold text-primary">
                Order history
              </h2>
            </div>
          </div>
          {orders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-outline-variant/25 px-6 py-10 text-center">
              <Icon
                name="receipt_long"
                className="text-3xl text-outline mb-3"
              />
              <div className="font-headline text-base text-primary mb-1">
                No orders yet
              </div>
              <p className="font-body text-sm text-on-surface-variant mb-4">
                Your Cashfree orders will appear here after your first checkout.
              </p>
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 bg-primary text-on-primary font-headline font-semibold px-4 py-2 rounded-lg hover:bg-primary-container transition-colors"
              >
                Browse plans
                <Icon name="arrow_forward" className="text-base" />
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-outline-variant/10 rounded-xl border border-outline-variant/15 bg-surface-container-lowest overflow-hidden">
              {orders.map((o) => (
                <li key={o._id}>
                  <div className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <div className="font-headline text-base font-semibold text-primary truncate">
                        {o.productType === "subscription"
                          ? planLabel(o.planSlug) + " subscription"
                          : o.jobTitle
                            ? `Unlock: ${o.jobTitle}`
                            : "Job unlock"}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 font-body text-xs text-on-surface-variant">
                        <span>{formatDate(o.createdAt)}</span>
                        <span className="text-outline-variant/50">·</span>
                        <span className="font-mono">{o.providerOrderId}</span>
                        {o.failureReason ? (
                          <>
                            <span className="text-outline-variant/50">·</span>
                            <span className="text-error truncate max-w-xs">
                              {o.failureReason}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="font-headline text-base font-semibold text-primary tabular-nums">
                        {formatPaise(o.amountPaise, o.currency)}
                      </div>
                      <StatusPill tone={statusTone[o.status]}>
                        {statusLabel[o.status]}
                      </StatusPill>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {entitlements && entitlements.length > 0 ? (
          <section>
            <div className="flex items-end justify-between gap-4 mb-5">
              <div>
                <div className="font-label text-[10px] uppercase tracking-[0.28em] text-outline-variant mb-2">
                  Entitlements
                </div>
                <h2 className="font-headline text-xl md:text-2xl font-bold text-primary">
                  Access grants
                </h2>
              </div>
            </div>
            <ul className="divide-y divide-outline-variant/10 rounded-xl border border-outline-variant/15 bg-surface-container-lowest overflow-hidden">
              {entitlements.map((e) => (
                <li key={e._id}>
                  <div className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <div className="font-headline text-base font-semibold text-primary truncate">
                        {e.kind === "subscription"
                          ? `${planLabel(e.planSlug)} subscription`
                          : e.jobTitle
                            ? `Job unlock: ${e.jobTitle}`
                            : "Job unlock"}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 font-body text-xs text-on-surface-variant">
                        <span>Started {formatDate(e.startsAt)}</span>
                        {e.expiresAt ? (
                          <>
                            <span className="text-outline-variant/50">·</span>
                            <span>Expires {formatDate(e.expiresAt)}</span>
                          </>
                        ) : null}
                        <span className="text-outline-variant/50">·</span>
                        <span className="capitalize">Source: {e.source}</span>
                      </div>
                    </div>
                    <StatusPill tone={entStatusTone(e.status)}>
                      {e.status}
                    </StatusPill>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function planLabel(slug: string | undefined): string {
  if (!slug) return "Custom";
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

function entStatusTone(
  s: "active" | "canceled" | "expired" | "refunded",
): "good" | "muted" | "bad" {
  if (s === "active") return "good";
  if (s === "refunded") return "bad";
  return "muted";
}

function StatusPill({
  tone,
  children,
}: {
  tone: "neutral" | "active" | "good" | "bad" | "muted";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "font-label text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full border whitespace-nowrap",
        tone === "good" && "text-primary bg-primary/10 border-primary/30",
        tone === "active" &&
          "text-primary bg-primary/10 border-primary/30",
        tone === "neutral" &&
          "text-on-surface bg-surface-container-high border-outline-variant/30",
        tone === "muted" &&
          "text-on-surface-variant bg-surface-container border-outline-variant/25",
        tone === "bad" && "text-error bg-error/10 border-error/30",
      )}
    >
      {children}
    </span>
  );
}
