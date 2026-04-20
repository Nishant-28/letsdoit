import { useEffect, useRef, useState } from "react";
import { NavLink, Link } from "react-router";
import { useAuth } from "@/lib/auth";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

const linkBase =
  "font-medium transition-colors font-['Space_Grotesk'] tracking-tight hover:bg-surface-container-high px-2 py-1 rounded-md duration-300";

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    linkBase,
    isActive
      ? "text-primary border-b-2 border-primary pb-1 font-bold"
      : "text-on-surface-variant/70 hover:text-primary",
  );
}

function UserMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (ref.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-md border border-outline hover:bg-surface-container transition-colors duration-200"
      >
        <Icon name="account_circle" className="text-xl" />
        <span className="hidden sm:inline text-sm font-label text-on-surface">
          {user.name}
        </span>
        {user.role === "admin" ? (
          <span className="bg-primary/10 text-primary text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-md">
            admin
          </span>
        ) : null}
        <Icon name="expand_more" className="text-base" />
      </button>
      {open ? (
        <div className="absolute right-0 mt-2 w-56 rounded-md border border-outline bg-surface shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-outline">
            <div className="text-sm font-medium text-on-surface truncate">
              {user.name}
            </div>
            <div className="text-xs text-on-surface-variant truncate">
              {user.email}
            </div>
          </div>
          <Link
            to="/account"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-on-surface hover:bg-surface-container"
          >
            Account
          </Link>
          <Link
            to="/tracker"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-on-surface hover:bg-surface-container"
          >
            Tracker
          </Link>
          {user.role === "admin" ? (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-on-surface hover:bg-surface-container"
            >
              Admin
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container border-t border-outline"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function TopNav() {
  const { user, authLoading, workosSession } = useAuth();
  // "Bootstrapping" covers the narrow window after page load where we have a
  // stored WorkOS session in localStorage but the Convex sync hasn't finished
  // yet. Without a stored session there's nothing to wait on, so the nav can
  // show "Sign in" immediately.
  const bootstrapping = authLoading && !user && workosSession !== null;
  return (
    <header className="sticky top-0 z-50 w-full bg-surface/80 backdrop-blur-md shadow-[0_32px_64px_-15px_rgba(229,226,225,0.04)]">
      <div className="flex justify-between items-center w-full px-8 py-4 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-12">
          <Link
            to="/"
            className="text-2xl font-bold tracking-tighter text-primary font-['Space_Grotesk']"
          >
            LET'S DO IT
          </Link>
          <nav className="hidden md:flex gap-2">
            <NavLink to="/" end className={navClass}>
              Explore
            </NavLink>
            <NavLink to="/pricing" className={navClass}>
              Pricing
            </NavLink>
            {user ? (
              <NavLink to="/tracker" className={navClass}>
                Tracker
              </NavLink>
            ) : null}
            {user?.role === "admin" ? (
              <NavLink to="/admin" className={navClass}>
                Admin
              </NavLink>
            ) : null}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <UserMenu />
          ) : bootstrapping ? (
            <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant px-3 py-2">
              Loading…
            </span>
          ) : (
            <>
              <Link
                to="/login"
                className="text-on-surface-variant hover:text-on-surface font-headline font-semibold px-3 py-2 rounded-md transition-colors duration-200"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="bg-primary text-on-primary font-['Space_Grotesk'] font-semibold px-6 py-2.5 rounded-md hover:bg-primary-container transition-colors duration-300"
              >
                Get Access
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
