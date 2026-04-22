import type { ReactNode } from "react";
import { Link } from "react-router";
import { Icon } from "@/components/Icon";

/**
 * Branded frame for login, signup, and callback pages. Pairs a left "brand
 * panel" reminiscent of the landing hero with a right "content panel" that
 * holds the actual auth step content. On mobile the brand panel collapses
 * into a compact header strip.
 */
export function AuthFrame({
  eyebrow = "Secure entry",
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Brand panel --------------------------------------------------- */}
        <aside className="relative hero-gradient lg:w-[44%] px-8 md:px-12 pt-8 pb-10 lg:p-14 flex flex-col overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-15">
            <svg height="100%" width="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern
                  id="auth-grid"
                  height="40"
                  width="40"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    className="text-outline-variant"
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect fill="url(#auth-grid)" height="100%" width="100%" />
            </svg>
          </div>

          <Link
            to="/"
            className="relative z-10 inline-flex items-center gap-2 w-fit text-xl font-bold tracking-tighter text-primary font-['Space_Grotesk']"
          >
            LET'S DO IT
          </Link>

          <div className="relative z-10 hidden lg:flex flex-col justify-end flex-1 pt-20">
            <div className="font-label text-[11px] uppercase tracking-[0.3em] text-outline-variant mb-5">
              {eyebrow}
            </div>
            <h1 className="font-headline text-4xl xl:text-5xl font-bold tracking-tighter text-primary leading-[1.05]">
              Your journey,
              <br />
              authenticated.
            </h1>
            <p className="font-body text-base xl:text-lg text-on-surface-variant mt-6 max-w-md">
              Sign in to surface curated opportunities, track applications, and
              pick up exactly where you left off.
            </p>

            <ul className="mt-10 space-y-4 max-w-md">
              <BrandBullet
                icon="bolt"
                title="Zero-friction handoff"
                body="Hosted by WorkOS, secured end-to-end with short-lived tokens."
              />
              <BrandBullet
                icon="lock"
                title="Privacy by default"
                body="We never store passwords. Your identity stays yours."
              />
              <BrandBullet
                icon="auto_awesome"
                title="Tailored discovery"
                body="Signals and roles tuned to the intent you tell us."
              />
            </ul>
          </div>
        </aside>

        {/* Content panel ------------------------------------------------ */}
        <section className="flex-1 flex flex-col justify-center px-6 md:px-12 lg:px-16 py-12 lg:py-16">
          <div className="w-full max-w-md mx-auto">
            <div className="font-label text-[11px] uppercase tracking-[0.3em] text-outline-variant mb-4 lg:hidden">
              {eyebrow}
            </div>
            <h2 className="font-headline text-3xl md:text-4xl font-bold tracking-tighter text-primary">
              {title}
            </h2>
            {subtitle ? (
              <p className="font-body text-base text-on-surface-variant mt-3">
                {subtitle}
              </p>
            ) : null}
            <div className="mt-10">{children}</div>
            {footer ? (
              <div className="mt-8 text-sm text-on-surface-variant">
                {footer}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function BrandBullet({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-4">
      <span className="w-10 h-10 rounded-lg bg-surface-container-lowest border border-outline-variant/25 flex items-center justify-center text-primary shrink-0">
        <Icon name={icon} className="text-lg" />
      </span>
      <div>
        <div className="font-headline text-sm font-semibold text-primary">
          {title}
        </div>
        <p className="font-body text-sm text-on-surface-variant mt-0.5">{body}</p>
      </div>
    </li>
  );
}
