import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { useAuth } from "@workos-inc/authkit-react";
import { api } from "../../convex/_generated/api";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/app/PageHeader";
import { FullPageLoader } from "@/components/auth/FullPageLoader";
import { canAccessAdminSurface, DEFAULT_ADMIN_CODE } from "@/lib/admin";
import { cn } from "@/lib/utils";

type Intent = "candidate" | "recruiter";

export function Profile() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const user = useQuery(api.users.me, {});
  const updateProfile = useMutation(api.users.updateProfile);
  const claimAdminWithCode = useMutation(api.users.claimAdminWithCode);

  const [name, setName] = useState("");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [phone, setPhone] = useState("");
  const [primed, setPrimed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [claimCode, setClaimCode] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    if (user === null) {
      navigate("/callback", { replace: true });
      return;
    }
    if (!user || primed) return;
    setName(user.name ?? "");
    setIntent((user.intent as Intent) ?? null);
    setPhone(user.phoneE164?.replace("+91", "") ?? "");
    setPrimed(true);
  }, [user, primed, navigate]);

  if (user === undefined) {
    return <FullPageLoader label="Loading your profile" />;
  }
  if (user === null) {
    return <FullPageLoader label="Preparing your account" />;
  }

  const nameChanged = name.trim() !== (user.name ?? "");
  const intentChanged = (intent ?? null) !== (user.intent ?? null);
  const phoneChanged = (phone || "") !== (user.phoneE164?.replace("+91", "") ?? "");
  const dirty = nameChanged || intentChanged || phoneChanged;

  const onSave = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (phone && !/^\d{10}$/.test(phone)) {
      setError("Phone must be a 10-digit Indian mobile number.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        name: nameChanged ? name.trim() : undefined,
        intent: intentChanged ? intent ?? undefined : undefined,
        phoneE164: phoneChanged && phone ? `+91${phone}` : undefined,
      });
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt((t) => (t && Date.now() - t > 3500 ? null : t)), 3500);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update profile.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const onRevert = () => {
    setName(user.name ?? "");
    setIntent((user.intent as Intent) ?? null);
    setPhone(user.phoneE164?.replace("+91", "") ?? "");
    setError(null);
  };

  const onSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const onClaimAdmin = async () => {
    setClaimError(null);
    if (!claimCode.trim()) {
      setClaimError("Enter the administrator setup code.");
      return;
    }
    setClaiming(true);
    try {
      await claimAdminWithCode({ adminSignupCode: claimCode.trim() });
      setClaimCode("");
      navigate("/admin", { replace: true });
    } catch (err) {
      setClaimError(
        err instanceof Error ? err.message : "Could not grant administrator access.",
      );
    } finally {
      setClaiming(false);
    }
  };

  const admin = canAccessAdminSurface(user);

  return (
    <div>
      <div className="max-w-5xl mx-auto px-6 md:px-8 py-10 md:py-14 space-y-10">
        <PageHeader
          eyebrow="Account"
          title="Profile & settings"
          description="How you show up on Let's Do It, and how we reach you when it counts."
          actions={
            admin ? (
              <span className="inline-flex items-center gap-2 bg-primary/10 text-primary font-label text-xs px-3 py-1.5 rounded-full border border-primary/30 uppercase tracking-widest font-semibold">
                <Icon name="verified_user" className="text-[14px]" />
                Operator
              </span>
            ) : null
          }
        />

        {/* Identity summary ------------------------------------------- */}
        <section className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center font-headline text-xl font-semibold text-primary shrink-0">
            {initialsFor(user.name, user.email)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-headline text-xl font-semibold text-primary truncate">
              {user.name || user.email}
            </div>
            <div className="font-body text-sm text-on-surface-variant truncate">
              {user.email}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Tag label={user.intent ? labelForIntent(user.intent) : "Intent not set"} icon={iconForIntent(user.intent)} />
              <Tag
                label={user.phoneE164 ? user.phoneE164 : "Phone not set"}
                icon="call"
              />
              <Tag
                label={`Joined ${new Date(user._id ? Date.now() : Date.now()).getFullYear()}`}
                icon="calendar_month"
                hide
              />
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error flex items-start gap-3">
            <Icon name="error" className="text-base mt-0.5" />
            <span>{error}</span>
          </div>
        ) : null}

        {savedAt ? (
          <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary flex items-center gap-3">
            <Icon name="check_circle" className="text-base" />
            Changes saved.
          </div>
        ) : null}

        {/* Edit sections ---------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-8">
          <div className="space-y-6">
            <SettingsCard
              title="Identity"
              description="How hiring teams see you across Let's Do It."
            >
              <Field
                label="Full name"
                htmlFor="profile-name"
                // hint="Shown on applications and recruiter outreach."
              >
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 w-full bg-surface-container-lowest border border-outline-variant/25 rounded-lg px-4 py-2.5 font-body text-base text-on-surface placeholder:text-outline focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-colors"
                />
              </Field>

              <Field
                label="Email"
                hint="From your WorkOS identity. Change it by signing in with a new account."
              >
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="mt-2 w-full bg-surface-container/60 border border-outline-variant/15 rounded-lg px-4 py-2.5 font-body text-base text-on-surface-variant cursor-not-allowed"
                />
              </Field>
            </SettingsCard>

{/* Contact Details */}
            <SettingsCard
              title=""
              description=""
            >
              <Field
                label="Mobile number"
                htmlFor="profile-phone"
              >
                <div className="mt-2 flex items-stretch rounded-lg border border-outline-variant/25 bg-surface-container-lowest focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition-colors overflow-hidden">
                  <span className="px-4 flex items-center font-headline text-sm font-semibold text-on-surface border-r border-outline-variant/25 bg-surface-container">
                    +91
                  </span>
                  <input
                    id="profile-phone"
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    placeholder="9876543210"
                    maxLength={10}
                    className="flex-1 bg-transparent px-4 py-2.5 font-body text-base text-on-surface placeholder:text-outline focus:outline-none"
                  />
                </div>
              </Field>
            </SettingsCard>
          </div>

          {/* Sticky save panel + danger zone ---------------------- */}
          <aside className="space-y-6">
            <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-6 sticky top-24">
              <div className="font-label text-[10px] uppercase tracking-[0.28em] text-outline-variant mb-4">
                Pending changes
              </div>
              <div className="font-body text-sm text-on-surface-variant mb-5">
                {dirty
                  ? "You have unsaved edits. Save them, or revert to what's live."
                  : "No pending changes. Your profile is in sync."}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={onSave}
                  disabled={!dirty || saving}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 font-headline font-semibold px-5 py-2.5 rounded-lg transition-colors",
                    dirty
                      ? "bg-primary text-on-primary hover:bg-primary-container"
                      : "bg-surface-container text-on-surface-variant cursor-not-allowed",
                  )}
                >
                  {saving ? (
                    <>
                      <span className="relative w-4 h-4">
                        <span className="absolute inset-0 rounded-full border border-on-primary/30" />
                        <span className="absolute inset-0 rounded-full border-t border-on-primary animate-spin" />
                      </span>
                      Saving
                    </>
                  ) : (
                    <>
                      <Icon name="save" className="text-base" />
                      Save changes
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onRevert}
                  disabled={!dirty || saving}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 font-label text-sm px-5 py-2 rounded-lg border transition-colors",
                    dirty
                      ? "text-on-surface border-outline-variant/25 hover:bg-surface-container-low"
                      : "text-outline-variant/50 border-outline-variant/15 cursor-not-allowed",
                  )}
                >
                  Revert
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-6 md:p-7">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-5 pb-5 border-b border-outline-variant/15">
        <div>
          <h2 className="font-headline text-lg font-semibold text-primary">
            {title}
          </h2>
          <p className="font-body text-sm text-on-surface-variant mt-1">
            {description}
          </p>
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="font-label text-[11px] uppercase tracking-[0.25em] text-outline-variant"
      >
        {label}
      </label>
      {children}
      {hint ? (
        <p className="font-body text-xs text-on-surface-variant mt-2">{hint}</p>
      ) : null}
    </div>
  );
}

function IntentTile({
  active,
  onClick,
  icon,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "text-left rounded-xl border p-4 transition-all",
        active
          ? "border-primary/60 bg-primary/[0.06] shadow-[0_0_0_1px_var(--color-primary)]"
          : "border-outline-variant/20 bg-surface-container-lowest hover:border-outline-variant/40 hover:bg-surface-container-low",
      )}
    >
      <div className="flex items-center gap-3 mb-2">
        <span
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center border",
            active
              ? "bg-primary/15 border-primary/40 text-primary"
              : "bg-surface-container border-outline-variant/20 text-on-surface-variant",
          )}
        >
          <Icon name={icon} className="text-lg" />
        </span>
        <span className="font-headline text-sm font-semibold text-primary">
          {title}
        </span>
      </div>
      <p className="font-body text-xs text-on-surface-variant">{body}</p>
    </button>
  );
}

function Tag({
  label,
  icon,
  hide,
}: {
  label: string;
  icon: string;
  hide?: boolean;
}) {
  if (hide) return null;
  return (
    <span className="inline-flex items-center gap-1.5 bg-surface-container text-on-surface-variant font-label text-xs px-3 py-1 rounded-full border border-outline-variant/20">
      <Icon name={icon} className="text-[14px]" />
      {label}
    </span>
  );
}

function initialsFor(name: string | undefined | null, email: string | undefined | null) {
  const source = (name ?? "").trim() || (email ?? "").split("@")[0] || "";
  if (!source) return "·";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "·";
  const first = parts[0] ?? "";
  const second = parts.length > 1 ? parts[1] ?? "" : "";
  const a = first.charAt(0);
  const b = second.charAt(0);
  return (a + b).toUpperCase() || a.toUpperCase() || "·";
}

function labelForIntent(intent: "candidate" | "recruiter") {
  return intent === "candidate" ? "Exploring roles" : "Hiring talent";
}

function iconForIntent(intent: "candidate" | "recruiter" | undefined) {
  if (!intent) return "question_mark";
  return intent === "candidate" ? "person_search" : "campaign";
}
