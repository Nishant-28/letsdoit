import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Icon } from "@/components/Icon";
import { trackEvent } from "@/lib/posthog";
import { FullPageLoader } from "@/components/auth/FullPageLoader";
import { DEFAULT_ADMIN_CODE } from "@/lib/admin";
import { cn } from "@/lib/utils";

type Step = "name" | "intent" | "phone";
type Intent = "candidate" | "recruiter";

const STEPS: { id: Step; label: string; helper: string }[] = [
  { id: "name", label: "Identity", helper: "Tell us who you are" },
  { id: "intent", label: "Intent", helper: "Member or administrator" },
  { id: "phone", label: "Contact", helper: "Verify your mobile" },
];

export function Onboarding() {
  const navigate = useNavigate();
  const user = useQuery(api.users.me, {});
  const completeOnboarding = useMutation(api.users.completeOnboarding);

  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [intent, setIntent] = useState<Intent | null>(null);
  /** Platform admin — setup code (default or optional Convex env). */
  const [wantsAdmin, setWantsAdmin] = useState(false);
  const [adminSignupCode, setAdminSignupCode] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [primedFromUser, setPrimedFromUser] = useState(false);

  // Redirect completed users out of onboarding (done as an effect to
  // avoid calling navigate during render).
  useEffect(() => {
    if (user && user.onboarded) {
      navigate("/app", { replace: true });
    }
  }, [user, navigate]);

  // Pre-fill the name from WorkOS exactly once when the user loads.
  useEffect(() => {
    if (user && !primedFromUser) {
      setPrimedFromUser(true);
      if (user.name && !name) setName(user.name);
    }
  }, [user, primedFromUser, name]);

  const activeIndex = useMemo(
    () => STEPS.findIndex((s) => s.id === step),
    [step],
  );

  if (user === undefined) {
    return <FullPageLoader label="Preparing your onboarding" />;
  }

  if (user === null) {
    // This shouldn't happen under RequireAuth, but guard anyway.
    return <FullPageLoader label="Finalizing your account" />;
  }

  const goNext = () => {
    setError(null);
    if (step === "name") {
      if (!name.trim()) {
        setError("Please enter your name so we can greet you properly.");
        return;
      }
      setStep("intent");
      return;
    }
    if (step === "intent") {
      if (!wantsAdmin && !intent) {
        setError("Pick how you're using Let's Do It, or choose Platform administrator.");
        return;
      }
      if (wantsAdmin && !adminSignupCode.trim()) {
        setError(`Enter the administrator code (e.g. ${DEFAULT_ADMIN_CODE}) or your team's secret.`);
        return;
      }
      setStep("phone");
      return;
    }
  };

  const goBack = () => {
    setError(null);
    if (step === "intent") setStep("name");
    if (step === "phone") setStep("intent");
  };

  const onSubmit = async () => {
    setError(null);
    if (!/^\d{10}$/.test(phone)) {
      setError("Enter a 10-digit Indian mobile number.");
      return;
    }
    if (!wantsAdmin && !intent) {
      setError("Pick an intent before we finish up.");
      setStep("intent");
      return;
    }
    if (wantsAdmin && !adminSignupCode.trim()) {
      setError("Administrator code is required.");
      setStep("intent");
      return;
    }
    setSubmitting(true);
    try {
      const intentForApi: Intent = wantsAdmin ? "recruiter" : intent!;
      await completeOnboarding({
        name: name.trim(),
        intent: intentForApi,
        phoneE164: `+91${phone}`,
        requestAdmin: wantsAdmin ? true : undefined,
        adminSignupCode: wantsAdmin ? adminSignupCode.trim() : undefined,
      });
      trackEvent("onboarding_completed", { intent: intent });
      navigate("/app", { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to complete onboarding.";
      setError(message);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface hero-gradient flex flex-col">
      {/* Slim top bar so this feels like part of the product, not a modal. */}
      <header className="w-full px-8 py-4 border-b border-outline-variant/10 bg-surface/60 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="text-lg font-bold tracking-tighter text-primary font-['Space_Grotesk']"
          >
            LET'S DO IT
          </Link>
          <span className="font-label text-[11px] uppercase tracking-[0.3em] text-outline-variant">
            Onboarding · Step {activeIndex + 1} of {STEPS.length}
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          <div className="mb-10">
            <div className="font-label text-[11px] uppercase tracking-[0.3em] text-outline-variant mb-3">
              Welcome{user.name ? `, ${user.name.split(" ")[0]}` : ""}
            </div>
            <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tighter text-primary">
              Set up your profile
            </h1>
            <p className="font-body text-base text-on-surface-variant mt-3">
              Three short steps. You can fine-tune any of this later from your
              profile settings.
            </p>
          </div>

          {/* Step tracker */}
          <ol className="grid grid-cols-3 gap-3 mb-8">
            {STEPS.map((s, i) => {
              const state =
                i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
              return (
                <li
                  key={s.id}
                  className={cn(
                    "relative rounded-lg border px-4 py-3",
                    state === "done" && "border-primary/40 bg-primary/5",
                    state === "active" && "border-outline-variant/40 bg-surface-container-lowest",
                    state === "pending" && "border-outline-variant/15 bg-surface-container-lowest/40",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold",
                        state === "done" && "bg-primary text-on-primary",
                        state === "active" && "border border-primary text-primary",
                        state === "pending" && "border border-outline-variant/30 text-outline-variant",
                      )}
                    >
                      {state === "done" ? (
                        <Icon name="check" className="text-xs" />
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span
                      className={cn(
                        "font-label text-[11px] uppercase tracking-[0.22em]",
                        state === "pending"
                          ? "text-outline-variant"
                          : "text-on-surface",
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                  <div className="font-body text-xs text-on-surface-variant mt-2">
                    {s.helper}
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Step content */}
          <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest/80 backdrop-blur-sm p-6 md:p-8">
            {error ? (
              <div className="mb-6 flex items-start gap-3 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
                <Icon name="error" className="text-base mt-0.5" />
                <span>{error}</span>
              </div>
            ) : null}

            {step === "name" ? (
              <StepName name={name} setName={setName} onNext={goNext} />
            ) : null}
            {step === "intent" ? (
              <StepIntent
                intent={intent}
                setIntent={setIntent}
                wantsAdmin={wantsAdmin}
                setWantsAdmin={setWantsAdmin}
                adminSignupCode={adminSignupCode}
                setAdminSignupCode={setAdminSignupCode}
              />
            ) : null}
            {step === "phone" ? (
              <StepPhone phone={phone} setPhone={setPhone} />
            ) : null}

            <div className="flex items-center justify-between gap-3 pt-8 mt-8 border-t border-outline-variant/15">
              <button
                type="button"
                onClick={goBack}
                disabled={step === "name" || submitting}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-label text-sm transition-colors",
                  step === "name"
                    ? "text-outline-variant/50 cursor-not-allowed"
                    : "text-on-surface hover:bg-surface-container-low",
                )}
              >
                <Icon name="arrow_back" className="text-base" />
                Back
              </button>
              {step !== "phone" ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex items-center gap-2 bg-primary text-on-primary font-headline font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-container transition-colors"
                >
                  Continue
                  <Icon name="arrow_forward" className="text-base" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 bg-primary text-on-primary font-headline font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-container transition-colors disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                      <span className="relative w-4 h-4">
                        <span className="absolute inset-0 rounded-full border border-on-primary/30" />
                        <span className="absolute inset-0 rounded-full border-t border-on-primary animate-spin" />
                      </span>
                      Finishing up
                    </>
                  ) : (
                    <>
                      <Icon name="rocket_launch" className="text-base" />
                      Finish onboarding
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StepName({
  name,
  setName,
  onNext,
}: {
  name: string;
  setName: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-headline text-xl font-semibold text-primary">
          What should we call you?
        </h2>
        <p className="font-body text-sm text-on-surface-variant mt-1">
          Use the name you'd want hiring teams and teammates to see.
        </p>
      </div>
      <div>
        <label
          htmlFor="onb-name"
          className="font-label text-[11px] uppercase tracking-[0.25em] text-outline-variant"
        >
          Full name
        </label>
        <input
          id="onb-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onNext();
            }
          }}
          placeholder="Nishant Gupta"
          autoFocus
          className="mt-2 w-full bg-surface-container-lowest border border-outline-variant/25 rounded-lg px-4 py-3 font-body text-base text-on-surface placeholder:text-outline focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-colors"
        />
      </div>
    </div>
  );
}

function StepIntent({
  intent,
  setIntent,
  wantsAdmin,
  setWantsAdmin,
  adminSignupCode,
  setAdminSignupCode,
}: {
  intent: Intent | null;
  setIntent: (v: Intent) => void;
  wantsAdmin: boolean;
  setWantsAdmin: (v: boolean) => void;
  adminSignupCode: string;
  setAdminSignupCode: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-headline text-xl font-semibold text-primary">
          What brings you here?
        </h2>
        <p className="font-body text-sm text-on-surface-variant mt-1">
          Candidates and recruiters use the product normally. Choose{" "}
          <span className="text-primary">Platform administrator</span> only if
          you have the setup code. Default for now:{" "}
          <code className="text-xs bg-surface-container px-1 py-0.5 rounded">
            {DEFAULT_ADMIN_CODE}
          </code>{" "}
          — or set optional{" "}
          <code className="text-xs bg-surface-container px-1 py-0.5 rounded">
            ADMIN_SIGNUP_SECRET
          </code>{" "}
          in Convex.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <IntentChoice
          selected={!wantsAdmin && intent === "candidate"}
          onClick={() => {
            setWantsAdmin(false);
            setIntent("candidate");
          }}
          icon="person_search"
          title="I'm exploring roles"
          body="Curated opportunities, saved applications, and signal on what's worth your time."
          badge="Candidate"
        />
        {/* <IntentChoice
          selected={!wantsAdmin && intent === "recruiter"}
          onClick={() => {
            setWantsAdmin(false);
            setIntent("recruiter");
          }}
          icon="campaign"
          title="I'm hiring talent"
          body="Post roles, track applicants, and reach the right people through targeted channels."
          badge="Recruiter"
        /> */}
        <IntentChoice
          selected={wantsAdmin}
          onClick={() => {
            setWantsAdmin(true);
            setIntent(null);
          }}
          icon="admin_panel_settings"
          title="Platform administrator"
          body="Operator console, metrics, and catalog tools. Requires a secret code — not a public option."
          badge="Admin"
        />
      </div>
      {wantsAdmin ? (
        <div className="rounded-xl border border-primary/25 bg-primary/[0.04] p-4 space-y-2">
          <label
            htmlFor="onb-admin-code"
            className="font-label text-[11px] uppercase tracking-[0.25em] text-outline-variant"
          >
            Administrator setup code
          </label>
          <input
            id="onb-admin-code"
            type="password"
            autoComplete="off"
            value={adminSignupCode}
            onChange={(e) => setAdminSignupCode(e.target.value)}
            placeholder={DEFAULT_ADMIN_CODE}
            className="w-full bg-surface-container-lowest border border-outline-variant/25 rounded-lg px-4 py-3 font-body text-base text-on-surface placeholder:text-outline focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-colors"
          />
          <p className="font-body text-xs text-on-surface-variant">
            Use <strong>{DEFAULT_ADMIN_CODE}</strong> for now, or the optional{" "}
            <strong>ADMIN_SIGNUP_SECRET</strong> value from Convex if your team
            configured one.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function IntentChoice({
  selected,
  onClick,
  icon,
  title,
  body,
  badge,
}: {
  selected: boolean;
  onClick: () => void;
  icon: string;
  title: string;
  body: string;
  badge: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group text-left rounded-xl border p-5 transition-all",
        selected
          ? "border-primary/60 bg-primary/[0.06] shadow-[0_0_0_1px_var(--color-primary)]"
          : "border-outline-variant/20 bg-surface-container-lowest hover:border-outline-variant/40 hover:bg-surface-container-low",
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <span
          className={cn(
            "w-11 h-11 rounded-lg flex items-center justify-center border",
            selected
              ? "bg-primary/15 border-primary/40 text-primary"
              : "bg-surface-container border-outline-variant/20 text-on-surface-variant",
          )}
        >
          <Icon name={icon} className="text-xl" />
        </span>
        <span
          className={cn(
            "font-label text-[10px] uppercase tracking-[0.25em] px-2 py-1 rounded-full border",
            selected
              ? "border-primary/40 text-primary bg-primary/10"
              : "border-outline-variant/30 text-outline-variant",
          )}
        >
          {badge}
        </span>
      </div>
      <div className="font-headline text-base font-semibold text-primary mb-1.5">
        {title}
      </div>
      <p className="font-body text-sm text-on-surface-variant">{body}</p>
    </button>
  );
}

function StepPhone({
  phone,
  setPhone,
}: {
  phone: string;
  setPhone: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-headline text-xl font-semibold text-primary">
          Your mobile number
        </h2>
        <p className="font-body text-sm text-on-surface-variant mt-1">
          India-only for now (+91). Used for account recovery and critical
          role alerts — never for spam.
        </p>
      </div>
      <div>
        <label
          htmlFor="onb-phone"
          className="font-label text-[11px] uppercase tracking-[0.25em] text-outline-variant"
        >
          Mobile number
        </label>
        <div className="mt-2 flex items-stretch rounded-lg border border-outline-variant/25 bg-surface-container-lowest focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition-colors overflow-hidden">
          <span className="px-4 flex items-center font-headline text-sm font-semibold text-on-surface border-r border-outline-variant/25 bg-surface-container">
            +91
          </span>
          <input
            id="onb-phone"
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="9876543210"
            maxLength={10}
            autoFocus
            className="flex-1 bg-transparent px-4 py-3 font-body text-base text-on-surface placeholder:text-outline focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-outline-variant">
          <Icon name="lock" className="text-sm" />
          Encrypted and stored as E.164 (+91XXXXXXXXXX). We'll verify over SMS
          before we ever message you.
        </div>
      </div>
    </div>
  );
}
