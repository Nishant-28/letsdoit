import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@workos-inc/authkit-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Icon } from "@/components/Icon";
import { canAccessAdminSurface } from "@/lib/admin";
import { cn } from "@/lib/utils";

function initialsFrom(name: string | null | undefined, email: string | null | undefined) {
  const source = (name ?? "").trim() || (email ?? "").split("@")[0] || "";
  if (!source) return "·";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "·";
  const first = parts[0] ?? "";
  const second = parts.length > 1 ? (parts[1] ?? "") : "";
  const a = first.charAt(0);
  const b = second.charAt(0);
  return (a + b).toUpperCase() || a.toUpperCase() || "·";
}

export function UserMenu() {
  const { signOut } = useAuth();
  const me = useQuery(api.users.me, {});
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointer(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const displayName = me?.name ?? me?.email?.split("@")[0] ?? "Signed in";
  const email = me?.email ?? "";
  const initials = initialsFrom(me?.name, me?.email);
  const admin = canAccessAdminSurface(me);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-3 pl-1 pr-3 py-1 rounded-full border border-outline-variant/20 bg-surface-container-lowest/60 hover:bg-surface-container-low transition-colors",
          open && "bg-surface-container-low",
        )}
      >
        <span className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center font-headline text-xs font-semibold text-primary border border-outline-variant/30">
          {initials}
        </span>
        <span className="hidden sm:flex flex-col text-left leading-tight">
          <span className="font-headline text-xs font-semibold text-primary truncate max-w-[9rem]">
            {displayName}
          </span>
          <span className="font-label text-[10px] uppercase tracking-[0.2em] text-outline-variant">
            {admin ? "Admin" : (me?.intent ?? "Member")}
          </span>
        </span>
        <Icon name="expand_more" className="text-base text-on-surface-variant" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 rounded-xl border border-outline-variant/20 bg-surface-container-low shadow-[0_32px_64px_-15px_rgba(0,0,0,0.5)] overflow-hidden z-40"
        >
          <div className="px-4 py-4 border-b border-outline-variant/15">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center font-headline text-sm font-semibold text-primary border border-outline-variant/30">
                {initials}
              </span>
              <div className="min-w-0">
                <div className="font-headline text-sm font-semibold text-primary truncate">
                  {displayName}
                </div>
                <div className="font-body text-xs text-on-surface-variant truncate">
                  {email || "—"}
                </div>
              </div>
            </div>
            {admin ? (
              <div className="mt-3 inline-flex items-center gap-1.5 bg-primary/10 text-primary font-label text-[10px] px-2 py-1 rounded-full uppercase tracking-widest font-semibold">
                <Icon name="verified_user" className="text-[12px]" />
                Operator access
              </div>
            ) : null}
          </div>

          <MenuItem
            to="/app"
            icon="dashboard"
            label="Dashboard"
            onNavigate={() => setOpen(false)}
          />
          <MenuItem
            to="/profile"
            icon="manage_accounts"
            label="Account & settings"
            onNavigate={() => setOpen(false)}
          />
          {admin ? (
            <MenuItem
              to="/admin"
              icon="shield_person"
              label="Admin console"
              onNavigate={() => setOpen(false)}
            />
          ) : null}

          <div className="border-t border-outline-variant/15 px-2 py-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <Icon name="logout" className="text-lg text-on-surface-variant" />
              <span className="font-body text-sm">Sign out</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  to,
  icon,
  label,
  onNavigate,
}: {
  to: string;
  icon: string;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="flex items-center gap-3 px-4 py-2.5 text-on-surface hover:bg-surface-container-high transition-colors"
    >
      <Icon name={icon} className="text-lg text-on-surface-variant" />
      <span className="font-body text-sm">{label}</span>
    </Link>
  );
}
