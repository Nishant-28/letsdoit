import { useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/posthog";

const PAYMENT_ERROR_MESSAGES: Record<string, string> = {
  missing_hash:
    "PayU did not send a payment signature. Try again or contact support if this persists.",
  invalid_hash:
    "We could not verify the payment response with PayU. If money was debited, open billing history or contact support with your order id.",
  fulfillment:
    "Payment may have succeeded but we could not unlock your purchase automatically. Check billing history or contact support.",
  missing_txnid:
    "PayU returned without an order reference. Open billing history to confirm whether you were charged.",
};

function paymentErrorMessage(code: string | null): string | null {
  if (!code) return null;
  return PAYMENT_ERROR_MESSAGES[code] ?? `Something went wrong (${code}).`;
}

function CheckoutErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mb-5 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-left text-sm text-on-surface"
    >
      <p className="font-headline font-semibold text-error mb-1">
        Payment handoff issue
      </p>
      <p className="font-body text-on-surface-variant">{message}</p>
    </div>
  );
}

/**
 * Post-checkout landing page. The PayU callback flow redirects here with
 * `?orderId=<ldi_…>` after the hosted checkout flow completes (success,
 * failure, or user drop).
 *
 * Fulfillment itself happens in the PayU callback / reconcile path in
 * Convex. This
 * page subscribes to the `paymentOrders` row by `providerOrderId` and
 * reactively updates as the provider settles the order. Because Convex
 * queries are live subscriptions, no polling is needed.
 */
export function PaymentReturn() {
  const [params] = useSearchParams();
  const providerOrderId = params.get("orderId") ?? params.get("order_id") ?? "";
  const paymentErrorCode = params.get("paymentError");
  const paymentErrorText = paymentErrorMessage(paymentErrorCode);
  const navigate = useNavigate();
  const checkoutTracked = useRef<string | null>(null);

  const order = useQuery(
    api.paymentOrders.myOrder,
    providerOrderId ? { providerOrderId } : "skip",
  );

  const heroNextRoute = useMemo(() => {
    if (!order) return "/app";
    if (order.productType === "job_unlock" && order.jobId) {
      return `/jobs/${order.jobId}`;
    }
    return "/app";
  }, [order]);

  useEffect(() => {
    if (!order) return;
    const key = `${providerOrderId}:${order.status}`;
    if (checkoutTracked.current === key) return;
    if (order.status === "paid") {
      checkoutTracked.current = key;
      trackEvent("checkout_succeeded", {
        provider_order_id: providerOrderId,
        product_type: order.productType,
      });
    } else if (order.status === "failed" || order.status === "canceled") {
      checkoutTracked.current = key;
      trackEvent("checkout_failed", {
        provider_order_id: providerOrderId,
        status: order.status,
      });
    }
  }, [order, providerOrderId]);

  useEffect(() => {
    if (!order || order.status !== "paid") return;
    const t = window.setTimeout(() => {
      navigate(heroNextRoute, { replace: true });
    }, 1200);
    return () => window.clearTimeout(t);
  }, [order, heroNextRoute, navigate]);

  if (!providerOrderId) {
    return (
      <CenteredPanel>
        <CheckoutErrorBanner message={paymentErrorText} />
        <StateIcon name="help" tone="muted" />
        <h1 className="font-headline text-2xl text-primary mb-2">
          {paymentErrorText ? "Checkout incomplete" : "Missing order reference"}
        </h1>
        <p className="font-body text-sm text-on-surface-variant mb-6">
          {paymentErrorText
            ? "Use billing history to confirm whether you were charged."
            : "We couldn&apos;t find an order in your URL. Open your billing history to review recent purchases."}
        </p>
        <Link
          to="/billing"
          className="inline-flex items-center gap-2 bg-primary text-on-primary font-headline font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-container transition-colors"
        >
          <Icon name="receipt_long" className="text-base" />
          View billing history
        </Link>
      </CenteredPanel>
    );
  }

  if (order === undefined) {
    return (
      <CenteredPanel>
        <CheckoutErrorBanner message={paymentErrorText} />
        <StateIcon name="hourglass_top" tone="active" spin />
        <h1 className="font-headline text-2xl text-primary mb-2">
          Confirming your payment
        </h1>
        <p className="font-body text-sm text-on-surface-variant">
          One moment — PayU is finalising the transaction.
        </p>
      </CenteredPanel>
    );
  }

  if (order === null) {
    return (
      <CenteredPanel>
        <CheckoutErrorBanner message={paymentErrorText} />
        <StateIcon name="help" tone="muted" />
        <h1 className="font-headline text-2xl text-primary mb-2">
          Order not found
        </h1>
        <p className="font-body text-sm text-on-surface-variant mb-6">
          We couldn&apos;t find this order under your account. If you just
          signed in on a different device, try again there.
        </p>
        <Link
          to="/billing"
          className="inline-flex items-center gap-2 bg-primary text-on-primary font-headline font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-container transition-colors"
        >
          <Icon name="receipt_long" className="text-base" />
          View billing history
        </Link>
      </CenteredPanel>
    );
  }

  if (order.status === "paid") {
    return (
      <CenteredPanel>
        <StateIcon name="check_circle" tone="success" />
        <h1 className="font-headline text-2xl md:text-3xl text-primary mb-2">
          Payment successful
        </h1>
        <p className="font-body text-sm text-on-surface-variant mb-2">
          {order.productType === "subscription"
            ? "Your subscription is active. Every published job is unlocked."
            : "The job has been unlocked. Apply directly from the listing."}
        </p>
        <p className="font-label text-xs text-outline-variant mb-6">
          Redirecting you shortly…
        </p>
        <button
          type="button"
          onClick={() => navigate(heroNextRoute, { replace: true })}
          className="inline-flex items-center gap-2 bg-primary text-on-primary font-headline font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-container transition-colors"
        >
          Continue now
          <Icon name="arrow_forward" className="text-base" />
        </button>
      </CenteredPanel>
    );
  }

  if (order.status === "failed" || order.status === "canceled") {
    return (
      <CenteredPanel>
        <CheckoutErrorBanner message={paymentErrorText} />
        <StateIcon name="error" tone="error" />
        <h1 className="font-headline text-2xl md:text-3xl text-primary mb-2">
          Payment {order.status === "canceled" ? "canceled" : "failed"}
        </h1>
        <p className="font-body text-sm text-on-surface-variant mb-6">
          {order.failureReason ??
            (order.status === "canceled"
              ? "The payment was canceled before it completed."
              : "We couldn't confirm the payment. You were not charged.")}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary font-headline font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-container transition-colors"
          >
            <Icon name="replay" className="text-base" />
            Try again
          </button>
          <Link
            to="/billing"
            className="inline-flex items-center justify-center gap-2 border border-outline-variant/30 text-on-surface font-headline px-5 py-2.5 rounded-lg hover:bg-surface-container-low transition-colors"
          >
            View billing history
          </Link>
        </div>
      </CenteredPanel>
    );
  }

  if (order.status === "refunded") {
    return (
      <CenteredPanel>
        <StateIcon name="undo" tone="muted" />
        <h1 className="font-headline text-2xl md:text-3xl text-primary mb-2">
          Order refunded
        </h1>
        <p className="font-body text-sm text-on-surface-variant mb-6">
          Access granted from this order has been revoked.
        </p>
        <Link
          to="/billing"
          className="inline-flex items-center gap-2 bg-primary text-on-primary font-headline font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-container transition-colors"
        >
          <Icon name="receipt_long" className="text-base" />
          View billing history
        </Link>
      </CenteredPanel>
    );
  }

  return (
    <CenteredPanel>
      <CheckoutErrorBanner message={paymentErrorText} />
      <StateIcon name="hourglass_top" tone="active" spin />
      <h1 className="font-headline text-2xl text-primary mb-2">
        Waiting for confirmation
      </h1>
      <p className="font-body text-sm text-on-surface-variant mb-4">
        Your bank is finalising the transaction. This page updates
        automatically when PayU confirms the payment.
      </p>
      <p className="font-label text-xs text-outline-variant">
        Order: {providerOrderId}
      </p>
    </CenteredPanel>
  );
}

function CenteredPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-8 md:p-10 shadow-sm">
        {children}
      </div>
    </div>
  );
}

function StateIcon({
  name,
  tone,
  spin,
}: {
  name: string;
  tone: "success" | "error" | "active" | "muted";
  spin?: boolean;
}) {
  return (
    <div
      className={cn(
        "w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center border",
        tone === "success" && "bg-primary/10 border-primary/30 text-primary",
        tone === "error" && "bg-error/10 border-error/30 text-error",
        tone === "active" &&
          "bg-primary/10 border-primary/30 text-primary",
        tone === "muted" &&
          "bg-surface-container border-outline-variant/30 text-on-surface-variant",
      )}
    >
      <Icon name={name} className={cn("text-3xl", spin && "animate-spin")} />
    </div>
  );
}
