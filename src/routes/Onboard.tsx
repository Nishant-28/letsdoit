import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@/lib/auth";
import {
  AuthCard,
  Field,
  SubmitButton,
  inputClass,
} from "@/components/auth/AuthCard";

type Intent = "candidate" | "recruiter";

/**
 * One-time onboarding screen presented right after the first successful
 * sign-in. We collect:
 *   - display name (prefilled from WorkOS so most users just hit Continue)
 *   - whether they're here to find a role or to post one
 *
 * Stored on the `users` row via `users.setIntent`, which also stamps
 * `onboardedAt`. Subsequent sign-ins skip this screen.
 */
export function Onboard() {
  // `RequireAuth` (with skipOnboardCheck) already handles loading / error /
  // not-signed-in states, so by the time we render here `user` is non-null.
  const { user } = useAuth();
  const navigate = useNavigate();
  const setIntent = useMutation(api.users.setIntent);

  const [name, setName] = useState("");
  const [intent, setIntentState] = useState<Intent>("candidate");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.intent) setIntentState(user.intent);
  }, [user?.name, user?.intent]);

  if (!user) return <Navigate to="/login" replace />;
  if (user.onboarded) return <Navigate to="/" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (!name.trim()) {
      setError("Please enter a display name.");
      return;
    }
    setSubmitting(true);
    try {
      await setIntent({ intent, name: name.trim() });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save onboarding.");
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Welcome to Let's Do It"
      subtitle="A couple of quick questions to tailor your experience."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field
          id="name"
          label="Display name"
          hint="This is how we'll address you across the app."
        >
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Ada Lovelace"
            disabled={submitting}
          />
        </Field>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-label uppercase tracking-widest text-on-surface-variant">
            I'm here to…
          </span>
          <div className="grid grid-cols-1 gap-2">
            <IntentOption
              selected={intent === "candidate"}
              onClick={() => setIntentState("candidate")}
              title="Find a role"
              description="Browse premium jobs, unlock details, and track my applications."
              icon="work"
              disabled={submitting}
            />
            <IntentOption
              selected={intent === "recruiter"}
              onClick={() => setIntentState("recruiter")}
              title="Post a role"
              description="I'm hiring. I'll reach out about getting access to post jobs."
              icon="groups"
              disabled={submitting}
            />
          </div>
        </div>

        {error ? (
          <div className="text-sm text-error bg-error/10 border border-error/30 rounded-md px-3 py-2">
            {error}
          </div>
        ) : null}

        <SubmitButton pending={submitting}>Continue</SubmitButton>
      </form>
    </AuthCard>
  );
}

function IntentOption({
  selected,
  onClick,
  title,
  description,
  icon,
  disabled,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
  icon: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "text-left flex items-start gap-3 p-4 rounded-md border transition-colors duration-200",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/40"
          : "border-outline hover:border-on-surface-variant/50 hover:bg-surface-container/50",
      ].join(" ")}
    >
      <span
        className={`material-symbols-outlined text-2xl ${
          selected ? "text-primary" : "text-on-surface-variant"
        }`}
      >
        {icon}
      </span>
      <span className="flex-1">
        <span className="block font-headline font-semibold text-on-surface">
          {title}
        </span>
        <span className="block text-xs text-on-surface-variant mt-0.5">
          {description}
        </span>
      </span>
      <span
        className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
          selected ? "border-primary" : "border-outline"
        }`}
      >
        {selected ? (
          <span className="w-2 h-2 rounded-full bg-primary" />
        ) : null}
      </span>
    </button>
  );
}
