import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "@workos-inc/authkit-react";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { Icon } from "@/components/Icon";
import { DEFAULT_ADMIN_CODE } from "@/lib/admin";

export function Signup() {
  const { user, signUp } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const nextParam = params.get("next");
  const triggeredRef = useRef(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/callback", { replace: true });
      return;
    }
    if (triggeredRef.current) return;
    triggeredRef.current = true;

    const id = setTimeout(() => {
      setRedirecting(true);
      void signUp();
    }, 250);
    return () => clearTimeout(id);
  }, [user, signUp, navigate]);

  const onContinue = () => {
    setRedirecting(true);
    void signUp();
  };

  return (
    <AuthFrame
      eyebrow="Create account"
      title="Start your journey"
      subtitle="Tell us who you are and we'll surface the opportunities that fit. It takes less than a minute."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            Already have an account?{" "}
            <Link
              to={nextParam ? `/login?next=${nextParam}` : "/login"}
              className="text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </span>
          <Link
            to="/"
            className="text-xs uppercase tracking-widest text-outline-variant hover:text-primary"
          >
            Back to explore
          </Link>
        </div>
      }
    >
      <div className="space-y-4">
        <button
          type="button"
          onClick={onContinue}
          disabled={redirecting}
          className="w-full inline-flex items-center justify-center gap-3 bg-primary text-on-primary font-headline font-semibold px-6 py-3.5 rounded-lg hover:bg-primary-container transition-colors disabled:opacity-70"
        >
          {redirecting ? (
            <>
              <span className="relative w-4 h-4">
                <span className="absolute inset-0 rounded-full border border-on-primary/30" />
                <span className="absolute inset-0 rounded-full border-t border-on-primary animate-spin" />
              </span>
              Opening secure sign up
            </>
          ) : (
            <>
              <Icon name="person_add" className="text-base" />
              Create account with WorkOS
            </>
          )}
        </button>
        <ul className="space-y-2.5 pt-2">
          <Bullet>No passwords to manage — sign in with email or GitHub.</Bullet>
          <Bullet>Tell us once whether you're hiring or job-hunting.</Bullet>
          <Bullet>Secure your account with your Indian mobile number.</Bullet>
          <Bullet>
            Operator console: choose Platform administrator on onboarding and enter{" "}
            <code className="text-[11px] bg-surface-container px-1 rounded">
              {DEFAULT_ADMIN_CODE}
            </code>{" "}
            (or an optional Convex secret).
          </Bullet>
        </ul>
      </div>
    </AuthFrame>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm text-on-surface-variant">
      <span className="w-5 h-5 rounded-full bg-primary/10 border border-primary/30 text-primary flex items-center justify-center mt-0.5 shrink-0">
        <Icon name="check" className="text-xs" />
      </span>
      <span>{children}</span>
    </li>
  );
}
