import { useState } from "react";
import { Link, NavLink } from "react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { canAccessAdminSurface } from "@/lib/admin";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { UserMenu } from "./app/UserMenu";
import { Icon } from "./Icon";

const linkBase =
  "font-medium transition-colors font-['Space_Grotesk'] tracking-tight hover:text-primary px-3 py-2 rounded-md duration-300 text-sm";

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    linkBase,
    isActive
      ? "text-primary bg-surface-container-low"
      : "text-on-surface-variant/80",
  );
}

export function TopNav() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const admin = canAccessAdminSurface(me);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-surface/90 backdrop-blur-md border-b border-outline-variant/10 shadow-[0_32px_64px_-15px_rgba(229,226,225,0.04)]">
      <div className="flex justify-between items-center w-full px-4 sm:px-8 py-3 sm:py-4 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-6 sm:gap-10">
          <Link
            to={isAuthenticated ? "/app" : "/"}
            className="text-lg sm:text-2xl font-bold tracking-tighter text-primary font-['Space_Grotesk']"
          >
            LET'S DO IT
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {isAuthenticated ? (
              <NavLink to="/app" end className={navClass}>
                Dashboard
              </NavLink>
            ) : null}
            <NavLink to="/" end className={navClass}>
              Explore
            </NavLink>
            <NavLink to="/pricing" className={navClass}>
              Pricing
            </NavLink>
            {isAuthenticated ? (
              <NavLink to="/profile" className={navClass}>
                Profile
              </NavLink>
            ) : null}
            {admin ? (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  cn(
                    linkBase,
                    "flex items-center gap-2",
                    isActive
                      ? "text-primary bg-surface-container-low"
                      : "text-on-surface-variant/80",
                  )
                }
              >
                <span
                  aria-hidden
                  className="w-1.5 h-1.5 rounded-full bg-primary"
                />
                Admin
              </NavLink>
            ) : null}
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {!isLoading && (
            <>
              {isAuthenticated ? (
                <UserMenu />
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="outline" size="sm">
                      Login
                    </Button>
                  </Link>
                  <Link to="/signup" className="hidden sm:block">
                    <Button size="sm">Sign Up</Button>
                  </Link>
                </>
              )}
            </>
          )}
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-9 h-9 rounded-md flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            <Icon name={mobileOpen ? "close" : "menu"} className="text-xl" />
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-outline-variant/10 bg-surface/95 backdrop-blur-md px-4 py-3 space-y-1">
          {isAuthenticated ? (
            <NavLink
              to="/app"
              end
              className={navClass}
              onClick={() => setMobileOpen(false)}
            >
              Dashboard
            </NavLink>
          ) : null}
          <NavLink
            to="/"
            end
            className={navClass}
            onClick={() => setMobileOpen(false)}
          >
            Explore
          </NavLink>
          <NavLink
            to="/pricing"
            className={navClass}
            onClick={() => setMobileOpen(false)}
          >
            Pricing
          </NavLink>
          {isAuthenticated ? (
            <NavLink
              to="/profile"
              className={navClass}
              onClick={() => setMobileOpen(false)}
            >
              Profile
            </NavLink>
          ) : null}
          {admin ? (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                cn(
                  linkBase,
                  "flex items-center gap-2",
                  isActive
                    ? "text-primary bg-surface-container-low"
                    : "text-on-surface-variant/80",
                )
              }
              onClick={() => setMobileOpen(false)}
            >
              <span
                aria-hidden
                className="w-1.5 h-1.5 rounded-full bg-primary"
              />
              Admin
            </NavLink>
          ) : null}
          {!isAuthenticated && !isLoading && (
            <Link
              to="/signup"
              className="block sm:hidden mt-2"
              onClick={() => setMobileOpen(false)}
            >
              <Button size="sm" className="w-full">
                Sign Up
              </Button>
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}

