import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/lib/auth";
import * as session from "@/lib/workosSession";
import {
  AuthCard,
  SubmitButton,
  humanizeAuthError,
} from "@/components/auth/AuthCard";

type LocState =
  | {
      userId?: string;
      email?: string;
      password?: string;
      fresh?: boolean;
    }
  | null;

const CODE_LENGTH = 6;
/** Throttle the resend button so users don't hammer WorkOS. */
const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Email verification screen used after signup and after a sign-in attempt
 * against an unverified account. Requires `userId`, `email`, and `password`
 * to be passed through React Router state; without them we bounce back to
 * /login because there's nothing to verify against.
 *
 * The code field is a 6-cell grouped input so backspace, arrow keys, and
 * paste behave the way users expect from iOS and 1Password.
 */
export function VerifyEmail() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocState;
  const userId = state?.userId;
  const email = state?.email ?? "";
  const password = state?.password ?? "";

  const [digits, setDigits] = useState<string[]>(() =>
    Array(CODE_LENGTH).fill(""),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  if (user) return <Navigate to="/onboard" replace />;
  if (!userId || !email || !password) {
    return <Navigate to="/login" replace />;
  }

  const code = digits.join("");
  const canSubmit = code.length === CODE_LENGTH && !submitting;

  function setDigit(i: number, v: string) {
    const clean = v.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[i] = clean;
      return next;
    });
    if (clean && i < CODE_LENGTH - 1) inputs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < CODE_LENGTH - 1)
      inputs.current[i + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const txt = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!txt) return;
    e.preventDefault();
    const next = Array(CODE_LENGTH)
      .fill("")
      .map((_, i) => txt[i] ?? "");
    setDigits(next);
    const last = Math.min(txt.length, CODE_LENGTH) - 1;
    inputs.current[last >= 0 ? last : 0]?.focus();
  }

  async function submit(finalCode: string) {
    if (submitting || finalCode.length !== CODE_LENGTH) return;
    setSubmitting(true);
    setError(null);
    try {
      await session.verifyEmailAndSignIn({
        userId: userId!,
        code: finalCode,
        email,
        password,
      });
      navigate("/onboard", { replace: true });
    } catch (err) {
      setError(humanizeAuthError(err));
      // Clear the digits so the user can retype without backspacing each cell.
      setDigits(Array(CODE_LENGTH).fill(""));
      inputs.current[0]?.focus();
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (resending || resendCooldown > 0 || !userId) return;
    setResending(true);
    setResendMsg(null);
    setError(null);
    try {
      await session.resendVerificationEmail(userId);
      setResendMsg("Sent a new code. Check your inbox.");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(humanizeAuthError(err));
    } finally {
      setResending(false);
    }
  }

  // Auto-submit when the last digit is entered.
  useEffect(() => {
    if (code.length === CODE_LENGTH && !submitting && !error) {
      void submit(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <AuthCard
      title="Check your email"
      subtitle={
        <>
          We sent a 6-digit code to{" "}
          <span className="text-on-surface font-medium">{email}</span>. It may
          take a minute to arrive.
        </>
      }
      footer={
        <>
          Wrong email?{" "}
          <button
            type="button"
            onClick={() => navigate("/signup", { replace: true })}
            className="text-primary font-medium hover:underline"
          >
            Start over
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(code);
        }}
        className="flex flex-col gap-5"
      >
        <div className="flex gap-2 justify-center">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={1}
              disabled={submitting}
              className="w-12 h-14 text-center text-2xl font-headline font-semibold bg-surface border border-outline rounded-md outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          ))}
        </div>

        {error ? (
          <div className="text-sm text-error bg-error/10 border border-error/30 rounded-md px-3 py-2">
            {error}
          </div>
        ) : null}

        {resendMsg ? (
          <div className="text-sm text-primary bg-primary/10 border border-primary/30 rounded-md px-3 py-2">
            {resendMsg}
          </div>
        ) : null}

        <SubmitButton pending={submitting} disabled={!canSubmit}>
          Verify email
        </SubmitButton>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending || resendCooldown > 0}
          className="text-sm text-on-surface-variant hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resendCooldown > 0
            ? `Resend code in ${resendCooldown}s`
            : resending
              ? "Sending…"
              : "Didn't get it? Resend code"}
        </button>
      </form>
    </AuthCard>
  );
}
