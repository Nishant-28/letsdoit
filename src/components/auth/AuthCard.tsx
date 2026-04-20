import type { ReactNode } from "react";
import { Link } from "react-router";

/**
 * Wrapper around all unauthenticated flows (/login, /signup, /verify-email,
 * /forgot-password, /reset-password). Keeps branding + spacing consistent so
 * we don't drift between pages.
 */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-start justify-center px-4 py-12 md:py-20">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Link
            to="/"
            className="text-2xl font-bold tracking-tighter text-primary font-['Space_Grotesk']"
          >
            LET'S DO IT
          </Link>
          <h1 className="text-3xl font-headline font-bold text-on-surface">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-sm text-on-surface-variant max-w-sm">{subtitle}</p>
          ) : null}
        </div>
        <div className="bg-surface-container/40 border border-outline/60 rounded-xl p-6 md:p-8 shadow-sm">
          {children}
        </div>
        {footer ? (
          <div className="mt-6 text-center text-sm text-on-surface-variant">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Field({
  id,
  label,
  children,
  error,
  hint,
}: {
  id: string;
  label: string;
  children: ReactNode;
  error?: string | null;
  hint?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-xs font-label uppercase tracking-widest text-on-surface-variant"
      >
        {label}
      </label>
      {children}
      {error ? (
        <span className="text-xs text-error">{error}</span>
      ) : hint ? (
        <span className="text-xs text-on-surface-variant">{hint}</span>
      ) : null}
    </div>
  );
}

export function SubmitButton({
  children,
  disabled,
  pending,
  type = "submit",
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  pending?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || pending}
      className="w-full bg-primary text-on-primary font-headline font-semibold px-6 py-3 rounded-md hover:bg-primary-container transition-colors duration-300 disabled:opacity-50 disabled:cursor-wait"
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}

/** Uniform input styling used by every auth form. */
export const inputClass =
  "w-full bg-surface border border-outline text-on-surface rounded-md px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors duration-200 placeholder:text-on-surface-variant/60";

/**
 * Convert a thrown WorkOS error into a nicer inline message.
 * The backend tags every error with `[code]`; we map known codes here.
 */
export function humanizeAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const m = raw.match(/\[([^\]]+)\]\s*$/);
  const code = m ? m[1] : "";
  switch (code) {
    case "invalid_credentials":
    case "invalid_grant":
      return "Email or password is incorrect.";
    case "password_too_weak":
    case "weak_password":
      return "Password is too weak. Use at least 8 characters with a mix of letters, numbers, and symbols.";
    case "user_already_exists":
    case "email_already_exists":
      return "An account with this email already exists. Try signing in instead.";
    case "email_verification_required":
      return "Please verify your email to continue.";
    case "invalid_code":
    case "invalid_verification_code":
      return "That code is invalid or has expired.";
    case "invalid_password_reset_token":
    case "password_reset_token_expired":
      return "This reset link is invalid or has expired. Request a new one.";
    case "rate_limit_exceeded":
      return "Too many attempts. Please wait a minute and try again.";
    case "email_not_valid":
      return "Please enter a valid email address.";
    default:
      return raw.replace(/\s*\[[^\]]+\]\s*$/, "") || "Something went wrong.";
  }
}
