import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import * as session from "@/lib/workosSession";
import {
  AuthCard,
  Field,
  SubmitButton,
  inputClass,
  humanizeAuthError,
} from "@/components/auth/AuthCard";

/**
 * Landed on from the WorkOS password-reset email. The `?token=...` query
 * string is exchanged via `workos.resetPassword` to set a new password,
 * then we bounce to /login so the user can sign in with the new credentials.
 *
 * We deliberately do NOT auto-sign-in here: WorkOS's `resetPassword`
 * endpoint returns only a user object, not tokens, and requiring a fresh
 * login with the new password reassures the user that the reset worked.
 */
export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const valid = useMemo(() => password.length >= 8 && password === confirm, [
    password,
    confirm,
  ]);

  if (!token) return <Navigate to="/forgot-password" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await session.resetPassword({ token, newPassword: password });
      setDone(true);
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err) {
      setError(humanizeAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <AuthCard
        title="Password updated"
        subtitle="Redirecting you to sign in…"
      >
        <div className="text-center text-sm text-on-surface-variant">
          All set. You can now sign in with your new password.
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Set a new password"
      subtitle="Choose something strong — at least 8 characters with a mix of letters, numbers, and symbols."
      footer={
        <Link to="/login" className="text-primary font-medium hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field id="password" label="New password">
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
            disabled={submitting}
          />
        </Field>
        <Field id="confirm" label="Confirm password">
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
            disabled={submitting}
          />
        </Field>
        {error ? (
          <div className="text-sm text-error bg-error/10 border border-error/30 rounded-md px-3 py-2">
            {error}
          </div>
        ) : null}
        <SubmitButton pending={submitting} disabled={!valid}>
          Update password
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
