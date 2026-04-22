import { useState } from "react";
import { NavLink, Link } from "react-router";
import { useConvexAuth } from "convex/react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { UserMenu } from "./app/UserMenu";
import { Icon } from "./Icon";

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

export function TopNav() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-surface/80 backdrop-blur-md shadow-[0_32px_64px_-15px_rgba(229,226,225,0.04)]">
      <div className="flex justify-between items-center w-full px-4 sm:px-8 py-3 sm:py-4 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-6 sm:gap-12">
          <Link
            to="/"
            className="text-lg sm:text-2xl font-bold tracking-tighter text-primary font-['Space_Grotesk']"
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
            {isAuthenticated ? (
              <NavLink to="/app" className={navClass}>
                Dashboard
              </NavLink>
            ) : null}
          </nav>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-outline-variant/10 bg-surface/95 backdrop-blur-md px-4 py-3 space-y-1">
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
              to="/app"
              className={navClass}
              onClick={() => setMobileOpen(false)}
            >
              Dashboard
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
