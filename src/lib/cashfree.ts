import { load } from "@cashfreepayments/cashfree-js";

type CashfreeMode = "sandbox" | "production";

const sdkByMode: Partial<Record<CashfreeMode, ReturnType<typeof load>>> = {};

export async function startCashfreeCheckout({
  paymentSessionId,
  mode,
}: {
  paymentSessionId: string;
  mode: CashfreeMode;
}) {
  const sdkPromise = sdkByMode[mode] ?? load({ mode });
  sdkByMode[mode] = sdkPromise;

  const cashfree = await sdkPromise;
  if (!cashfree) {
    throw new Error("Cashfree checkout could not be loaded. Please try again.");
  }

  await cashfree.checkout({
    paymentSessionId,
    redirectTarget: "_self",
  });
}
