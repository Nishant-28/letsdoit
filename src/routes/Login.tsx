import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "@workos-inc/authkit-react";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { Icon } from "@/components/Icon";

export function Login() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const nextParam = params.get("next");
  const triggeredRef = useRef(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (user) {
      // Already signed in — send them through the callback flow so we
      // pick the right destination (onboarding vs. /app) based on state.
      navigate("/callback", { replace: true });
      return;
    }
    if (triggeredRef.current) return;
    triggeredRef.current = true;

    // Let the branded UI paint for a frame before we hand off to the
    // WorkOS hosted flow so the page never looks blank.
    const id = setTimeout(() => {
      setRedirecting(true);
      void signIn();
    }, 250);
    return () => clearTimeout(id);
  }, [user, signIn, navigate]);

  const onContinue = () => {
    setRedirecting(true);
    void signIn();
  };

  return (
    <AuthFrame
      eyebrow="Welcome back"
      title="Sign in to your account"
      subtitle="Continue with the email you used when you joined. We'll recognize you and drop you right back where you left off."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            New here?{" "}
            <Link
              to={nextParam ? `/signup?next=${nextParam}` : "/signup"}
              className="text-primary underline-offset-4 hover:underline"
            >
              Create an account
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
              Opening secure sign in
            </>
          ) : (
            <>
              <Icon name="login" className="text-base" />
              Continue with WorkOS
            </>
          )}
        </button>
        <div className="flex items-center gap-4 text-[11px] uppercase tracking-[0.25em] text-outline-variant">
          <span className="flex-1 h-px bg-outline-variant/20" />
          <span>Sign in options</span>
          <span className="flex-1 h-px bg-outline-variant/20" />
        </div>
        <ul className="grid grid-cols-2 gap-3">
          <MethodTile icon="alternate_email" label="Email & password" />
          <MethodTile icon="code" label="GitHub" />
        </ul>
        <p className="text-xs text-outline-variant">
          You'll be handed off to WorkOS — our identity layer — to complete
          sign in. Encrypted and password-less by design.
        </p>
      </div>
    </AuthFrame>
  );
}

function MethodTile({ icon, label }: { icon: string; label: string }) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-outline-variant/20 bg-surface-container-lowest/60 px-4 py-3">
      <Icon name={icon} className="text-base text-on-surface-variant" />
      <span className="font-label text-xs text-on-surface-variant">{label}</span>
    </li>
  );
}
