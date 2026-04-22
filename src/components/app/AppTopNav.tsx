import { useState } from "react";
import { Link, NavLink } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { canAccessAdminSurface } from "@/lib/admin";
import { cn } from "@/lib/utils";
import { UserMenu } from "./UserMenu";
import { Icon } from "@/components/Icon";

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

export function AppTopNav() {
  const me = useQuery(api.users.me, {});
  const admin = canAccessAdminSurface(me);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-surface/90 backdrop-blur-md border-b border-outline-variant/10">
      <div className="flex justify-between items-center w-full px-4 sm:px-8 py-3.5 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-6 sm:gap-10">
          <Link
            to="/app"
            className="text-lg sm:text-xl font-bold tracking-tighter text-primary font-['Space_Grotesk']"
          >
            LET'S DO IT
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/app" end className={navClass}>
              Dashboard
            </NavLink>
            <NavLink to="/" end className={navClass}>
              Explore
            </NavLink>
            <NavLink to="/pricing" className={navClass}>
              Pricing
            </NavLink>
            <NavLink to="/profile" className={navClass}>
              Profile
            </NavLink>
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
          <UserMenu />
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
          <NavLink
            to="/app"
            end
            className={navClass}
            onClick={() => setMobileOpen(false)}
          >
            Dashboard
          </NavLink>
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
          <NavLink
            to="/profile"
            className={navClass}
            onClick={() => setMobileOpen(false)}
          >
            Profile
          </NavLink>
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
        </nav>
      )}
    </header>
  );
}
