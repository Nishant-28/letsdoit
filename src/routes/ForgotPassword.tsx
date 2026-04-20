import { useState } from "react";
import { Link } from "react-router";
import * as session from "@/lib/workosSession";
import {
  AuthCard,
  Field,
  SubmitButton,
  inputClass,
  humanizeAuthError,
} from "@/components/auth/AuthCard";

/**
 * Kicks off WorkOS password reset. We intentionally show the same
 * confirmation screen regardless of whether the email actually exists, to
 * avoid leaking which addresses have accounts.
 */
export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }
    setSubmitting(true);
    try {
      await session.sendPasswordResetEmail(email.trim());
      setSent(true);
    } catch (err) {
      setError(humanizeAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthCard
        title="Check your email"
        subtitle={
          <>
            If an account exists for{" "}
            <span className="text-on-surface font-medium">{email}</span>, we've
            sent a link to reset your password. The link expires in 1 hour.
          </>
        }
        footer={
          <Link
            to="/login"
            className="text-primary font-medium hover:underline"
          >
            Back to sign in
          </Link>
        }
      >
        <p className="text-sm text-on-surface-variant">
          Didn't get an email? Check your spam folder, or try again with a
          different address.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-4 text-sm text-primary hover:underline"
        >
          Try a different email
        </button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to set a new password."
      footer={
        <Link to="/login" className="text-primary font-medium hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field id="email" label="Email">
          <input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
            disabled={submitting}
          />
        </Field>
        {error ? (
          <div className="text-sm text-error bg-error/10 border border-error/30 rounded-md px-3 py-2">
            {error}
          </div>
        ) : null}
        <SubmitButton pending={submitting}>Send reset link</SubmitButton>
      </form>
    </AuthCard>
  );
}
