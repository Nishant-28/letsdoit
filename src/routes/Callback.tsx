import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { Icon } from "@/components/Icon";

type CallbackStep =
  | "auth" // waiting for Convex auth to confirm the WorkOS handoff
  | "sync" // calling users.syncFromWorkOS
  | "route" // deciding where to send the user
  | "error";

export function Callback() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const syncUser = useMutation(api.users.syncFromWorkOS);
  const [step, setStep] = useState<CallbackStep>("auth");
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (authLoading) {
      setStep("auth");
      return;
    }
    if (!isAuthenticated) {
      // We got dropped here without an active session. Back to login.
      navigate("/login", { replace: true });
      return;
    }
    if (syncing) return;

    setStep("sync");
    setSyncing(true);
    syncUser()
      .then((user) => {
        setStep("route");
        // Small delay so the "you're in" state is visible for a moment
        // instead of feeling like an abrupt flash.
        setTimeout(() => {
          navigate(user.onboarded ? "/app" : "/onboarding", { replace: true });
        }, 450);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to sync your account";
        setError(message);
        setStep("error");
        setSyncing(false);
      });
  }, [authLoading, isAuthenticated, syncUser, navigate, syncing]);

  return (
    <AuthFrame
      eyebrow="Authenticating"
      title={titleFor(step)}
      subtitle={subtitleFor(step)}
    >
      {step === "error" ? (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            <Icon name="error" className="text-base mt-0.5" />
            <span>{error ?? "Something went wrong."}</span>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary font-headline font-semibold px-5 py-3 rounded-lg hover:bg-primary-container transition-colors"
            >
              <Icon name="refresh" className="text-base" />
              Try again
            </button>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 border border-outline-variant/30 text-on-surface font-headline px-5 py-3 rounded-lg hover:bg-surface-container-low transition-colors"
            >
              Back to explore
            </Link>
          </div>
        </div>
      ) : (
        <ol className="space-y-3">
          <Step
            label="Verifying your WorkOS session"
            state={stateFor("auth", step)}
          />
          <Step
            label="Syncing your account with Convex"
            state={stateFor("sync", step)}
          />
          <Step
            label="Routing you to the right place"
            state={stateFor("route", step)}
          />
        </ol>
      )}
    </AuthFrame>
  );
}

type StepState = "pending" | "active" | "done";

function stateFor(target: CallbackStep, current: CallbackStep): StepState {
  const order: CallbackStep[] = ["auth", "sync", "route"];
  const ti = order.indexOf(target);
  const ci = order.indexOf(current);
  if (ti === ci) return "active";
  if (ti < ci) return "done";
  return "pending";
}

function Step({ label, state }: { label: string; state: StepState }) {
  return (
    <li className="flex items-center gap-4 rounded-lg border border-outline-variant/20 bg-surface-container-lowest/60 px-4 py-3">
      <span
        className={
          state === "done"
            ? "w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center"
            : state === "active"
              ? "w-7 h-7 rounded-full border border-primary text-primary flex items-center justify-center"
              : "w-7 h-7 rounded-full border border-outline-variant/30 text-outline-variant flex items-center justify-center"
        }
      >
        {state === "done" ? (
          <Icon name="check" className="text-sm" />
        ) : state === "active" ? (
          <span className="relative w-3 h-3">
            <span className="absolute inset-0 rounded-full border border-primary/30" />
            <span className="absolute inset-0 rounded-full border-t border-primary animate-spin" />
          </span>
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-outline-variant/60" />
        )}
      </span>
      <span
        className={
          state === "pending"
            ? "font-body text-sm text-outline-variant"
            : "font-body text-sm text-on-surface"
        }
      >
        {label}
      </span>
    </li>
  );
}

function titleFor(step: CallbackStep): string {
  switch (step) {
    case "auth":
      return "Confirming you're you";
    case "sync":
      return "Setting up your workspace";
    case "route":
      return "You're in";
    case "error":
      return "We couldn't finish signing you in";
  }
}

function subtitleFor(step: CallbackStep): string {
  switch (step) {
    case "auth":
      return "Completing the handoff from WorkOS securely.";
    case "sync":
      return "Making sure your profile is current inside the platform.";
    case "route":
      return "Taking you to the right place for where you are in your journey.";
    case "error":
      return "Something interrupted the handoff. You can try again, or head back to explore.";
  }
}
