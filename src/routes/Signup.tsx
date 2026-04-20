import { useState } from "react";
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

/** Minimum password length accepted. Keep in sync with the WorkOS project. */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Create a WorkOS account, then hop to /verify-email carrying the userId,
 * email, and (in-memory) password so the verify screen can call
 * `verifyEmailAndSignIn` without asking the user to retype anything.
 */
export function Signup() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to={from} replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!email.trim() || !password) {
      setError("Enter your email and a password.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await session.signUpWithPassword({
        email: email.trim(),
        password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });
      navigate("/verify-email", {
        replace: true,
        state: {
          userId: res.userId,
          email: res.email,
          password,
          fresh: true,
        },
      });
    } catch (err) {
      setError(humanizeAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Join Let's Do It to unlock premium roles and track your applications."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            state={{ from }}
            className="text-primary font-medium hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field id="firstName" label="First name">
            <input
              id="firstName"
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClass}
              placeholder="Ada"
              disabled={submitting}
            />
          </Field>
          <Field id="lastName" label="Last name">
            <input
              id="lastName"
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClass}
              placeholder="Lovelace"
              disabled={submitting}
            />
          </Field>
        </div>
        <Field id="email" label="Work email">
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
            disabled={submitting}
          />
        </Field>
        <Field
          id="password"
          label="Password"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        >
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

        <SubmitButton pending={submitting}>Create account</SubmitButton>

        <p className="text-xs text-on-surface-variant text-center">
          We'll send a 6-digit code to your email to verify it's you.
        </p>
      </form>
    </AuthCard>
  );
}
