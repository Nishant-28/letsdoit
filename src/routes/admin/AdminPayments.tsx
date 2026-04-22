import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useAction, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/app/PageHeader";
import { FullPageLoader } from "@/components/auth/FullPageLoader";
import { cn } from "@/lib/utils";

type Order = FunctionReturnType<typeof api.paymentOrders.adminList>[number];
type Status = Order["status"];

const STATUS_LABEL: Record<Status, string> = {
  created: "Created",
  payment_pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  canceled: "Canceled",
  refunded: "Refunded",
};

const STATUS_TONE: Record<
  Status,
  "success" | "pending" | "failure" | "neutral"
> = {
  created: "pending",
  payment_pending: "pending",
  paid: "success",
  failed: "failure",
  canceled: "neutral",
  refunded: "neutral",
};

type Filter = "all" | "pending" | "paid" | "failed" | "refunded";

export function AdminPayments() {
  const orders = useQuery(api.paymentOrders.adminList, { limit: 200 });
  const reconcile = useAction(api.payments.adminReconcileOrder);

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [flash, setFlash] = useState<
    | { tone: "success" | "error"; text: string; orderId: string }
    | null
  >(null);

  const filtered = useMemo(() => {
    if (!orders) return [];
    const needle = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter === "pending") {
        if (o.status !== "created" && o.status !== "payment_pending")
          return false;
      } else if (filter === "paid" && o.status !== "paid") return false;
      else if (filter === "failed" && o.status !== "failed" && o.status !== "canceled")
        return false;
      else if (filter === "refunded" && o.status !== "refunded") return false;

      if (!needle) return true;
      const haystack = [
        o.providerOrderId,
        o.userEmail ?? "",
        o.userName ?? "",
        o.jobTitle ?? "",
        o.planSlug ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [orders, filter, search]);

  if (orders === undefined) {
    return <FullPageLoader label="Loading payment orders" />;
  }

  const counts = {
    all: orders.length,
    pending: orders.filter(
      (o) => o.status === "created" || o.status === "payment_pending",
    ).length,
    paid: orders.filter((o) => o.status === "paid").length,
    failed: orders.filter((o) => o.status === "failed" || o.status === "canceled")
      .length,
    refunded: orders.filter((o) => o.status === "refunded").length,
  };

  async function onReconcile(o: Order) {
    setBusyOrderId(o.providerOrderId);
    setFlash(null);
    try {
      const result = await reconcile({ providerOrderId: o.providerOrderId });
      setFlash({
        tone: "success",
        text: `Cashfree reports ${result.status} · action: ${result.action.replace(/_/g, " ")}`,
        orderId: o.providerOrderId,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setFlash({
        tone: "error",
        text: msg,
        orderId: o.providerOrderId,
      });
    } finally {
      setBusyOrderId(null);
    }
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-10 space-y-8">
      <PageHeader
        eyebrow="System"
        title="Payments"
        description="All Cashfree orders, their fulfillment state, and a reconcile hook for webhook misses."
        actions={
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 border border-outline-variant/30 text-on-surface font-headline px-4 py-2 rounded-lg hover:bg-surface-container-low transition-colors"
          >
            <Icon name="arrow_back" className="text-base" />
            Back to admin
          </Link>
        }
      />

      <div className="flex flex-col gap-5 bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-5">
        <div className="flex flex-wrap items-center gap-3">
          <FilterPill
            label="All"
            count={counts.all}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          <FilterPill
            label="Pending"
            count={counts.pending}
            active={filter === "pending"}
            onClick={() => setFilter("pending")}
            tone="pending"
          />
          <FilterPill
            label="Paid"
            count={counts.paid}
            active={filter === "paid"}
            onClick={() => setFilter("paid")}
            tone="success"
          />
          <FilterPill
            label="Failed / Canceled"
            count={counts.failed}
            active={filter === "failed"}
            onClick={() => setFilter("failed")}
            tone="failure"
          />
          <FilterPill
            label="Refunded"
            count={counts.refunded}
            active={filter === "refunded"}
            onClick={() => setFilter("refunded")}
          />

          <div className="relative ml-auto w-full md:w-80">
            <Icon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant"
            />
            <input
              type="text"
              placeholder="Search order id, user, plan, job..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant/20 rounded-lg pl-10 pr-4 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Icon name="inbox" className="text-4xl text-outline mb-3" />
            <div className="font-headline text-base text-primary mb-1">
              No orders match
            </div>
            <p className="font-body text-sm text-on-surface-variant">
              Try a different filter or clear the search.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant/20 text-outline-variant uppercase tracking-wider text-[10px] font-label">
                  <th className="px-3 py-3 font-medium">Order</th>
                  <th className="px-3 py-3 font-medium">User</th>
                  <th className="px-3 py-3 font-medium">Product</th>
                  <th className="px-3 py-3 font-medium">Amount</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Created</th>
                  <th className="px-3 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map((o) => {
                  const isFlash =
                    flash?.orderId === o.providerOrderId ? flash : null;
                  return (
                    <tr
                      key={o._id}
                      className="hover:bg-surface-container-low/40 align-top"
                    >
                      <td className="px-3 py-3 font-mono text-xs text-on-surface whitespace-nowrap">
                        <div className="truncate max-w-[14rem]" title={o.providerOrderId}>
                          {o.providerOrderId}
                        </div>
                        {o.lastWebhookEventType ? (
                          <div className="mt-1 text-[10px] text-outline-variant font-body uppercase tracking-wider">
                            last: {o.lastWebhookEventType}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-primary truncate max-w-[12rem]">
                          {o.userName ?? "—"}
                        </div>
                        <div className="text-xs text-on-surface-variant truncate max-w-[12rem]">
                          {o.userEmail ?? ""}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-on-surface whitespace-nowrap">
                        {o.productType === "subscription" ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Icon name="diamond" className="text-sm text-primary" />
                            <span className="capitalize">{o.planSlug ?? "subscription"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            <Icon name="lock_open" className="text-sm text-primary" />
                            <span className="truncate max-w-[12rem]">
                              {o.jobTitle ?? "Job unlock"}
                            </span>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-body tabular-nums text-on-surface whitespace-nowrap">
                        {formatRupees(o.amountPaise)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <StatusPill tone={STATUS_TONE[o.status]}>
                          {STATUS_LABEL[o.status]}
                        </StatusPill>
                        {o.failureReason ? (
                          <div
                            className="mt-1 text-[11px] text-on-surface-variant font-body max-w-[18rem] truncate"
                            title={o.failureReason}
                          >
                            {o.failureReason}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-on-surface-variant whitespace-nowrap font-body text-xs">
                        {new Date(o.createdAt).toLocaleString()}
                        {o.paidAt ? (
                          <div className="text-[11px] text-primary">
                            paid {new Date(o.paidAt).toLocaleString()}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => void onReconcile(o)}
                          disabled={busyOrderId === o.providerOrderId}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant/25 text-xs font-headline text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-60 disabled:cursor-wait",
                          )}
                        >
                          <Icon
                            name={
                              busyOrderId === o.providerOrderId
                                ? "hourglass_top"
                                : "refresh"
                            }
                            className="text-sm"
                          />
                          Reconcile
                        </button>
                        {isFlash ? (
                          <div
                            className={cn(
                              "mt-2 text-[11px] max-w-[20rem] text-right ml-auto font-body",
                              isFlash.tone === "success"
                                ? "text-primary"
                                : "text-amber-400",
                            )}
                          >
                            {isFlash.text}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterPill({
  label,
  count,
  active,
  onClick,
  tone,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  tone?: "success" | "pending" | "failure";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-headline transition-colors",
        active
          ? tone === "success"
            ? "bg-primary/15 border-primary/40 text-primary"
            : tone === "failure"
              ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
              : tone === "pending"
                ? "bg-surface-container-high border-outline-variant/40 text-primary"
                : "bg-surface-container-high border-outline-variant/40 text-primary"
          : "border-outline-variant/25 text-on-surface-variant hover:bg-surface-container-low",
      )}
    >
      <span>{label}</span>
      <span className="font-body text-[11px] tabular-nums text-outline-variant">
        {count}
      </span>
    </button>
  );
}

function StatusPill({
  tone,
  children,
}: {
  tone: "success" | "pending" | "failure" | "neutral";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "font-label text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full border whitespace-nowrap",
        tone === "success" && "text-primary bg-primary/10 border-primary/30",
        tone === "pending" &&
          "text-on-surface bg-surface-container-high border-outline-variant/30",
        tone === "failure" &&
          "text-amber-300 bg-amber-500/10 border-amber-500/30",
        tone === "neutral" &&
          "text-on-surface-variant bg-surface-container border-outline-variant/20",
      )}
    >
      {children}
    </span>
  );
}

function formatRupees(paise: number): string {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
