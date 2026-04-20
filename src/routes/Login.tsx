import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/lib/auth";
import * as session from "@/lib/workosSession";
import {
  AuthCard,
  Field,
  SubmitButton,
  inputClass,
  humanizeAuthError,
} from "@/components/auth/AuthCard";

/**
 * Email + password sign-in.
 *
 * If WorkOS tells us the account exists but isn't verified yet, we route to
 * /verify-email with the `pendingAuthenticationToken` so the user can finish
 * onboarding without having to retype their credentials.
 */
export function Login() {
  const { user, authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("postLoginTo", from);
    }
  }, [from]);

  if (user) return <Navigate to={from} replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await session.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (res.kind === "email_verification_required") {
        navigate("/verify-email", {
          replace: true,
          state: {
            userId: res.userId,
            email: res.email,
            password,
          },
        });
        return;
      }
      // AuthProvider will notice the new session and complete the Convex
      // sync; RequireAuth renders children once `me` resolves.
      navigate(from, { replace: true });
    } catch (err) {
      setError(humanizeAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const bootstrapping = authLoading && !user;

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to access premium roles and track your applications."
      footer={
        <>
          New here?{" "}
          <Link
            to="/signup"
            state={{ from }}
            className="text-primary font-medium hover:underline"
          >
            Create an account
          </Link>
        </>
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
        <Field id="password" label="Password">
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
            disabled={submitting}
          />
        </Field>

        <div className="flex justify-end -mt-1">
          <Link
            to="/forgot-password"
            className="text-xs text-on-surface-variant hover:text-primary"
          >
            Forgot password?
          </Link>
        </div>

        {error ? (
          <div className="text-sm text-error bg-error/10 border border-error/30 rounded-md px-3 py-2">
            {error}
          </div>
        ) : null}

        <SubmitButton pending={submitting || bootstrapping}>
          Sign in
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
