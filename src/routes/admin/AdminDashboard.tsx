import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { FullPageLoader } from "@/components/auth/FullPageLoader";
import { cn } from "@/lib/utils";

type Stats = FunctionReturnType<typeof api.admin.adminStats>;

const statusTone: Record<
  Stats["recentJobs"][number]["status"],
  "neutral" | "active" | "muted"
> = {
  draft: "muted",
  published: "active",
  archived: "muted",
};

const statusLabel: Record<
  Stats["recentJobs"][number]["status"],
  string
> = {
  draft: "Draft",
  published: "Live",
  archived: "Archived",
};

export function AdminDashboard() {
  const user = useQuery(api.users.me, {});

  // Anchor the time window on the client, then let the query cache by
  // that fixed value. Re-nudge it every 5 minutes so the "last 24h"
  // counters stay roughly fresh without re-firing on every render.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const stats = useQuery(api.admin.adminStats, { now });

  if (stats === undefined || user === undefined) {
    return <FullPageLoader label="Loading the operator console" />;
  }
  if (stats === null || user === null) {
    return <FullPageLoader label="Verifying your access" />;
  }

  return (
    <div>
      <div className="max-w-screen-2xl mx-auto px-6 md:px-8 py-10 md:py-14 space-y-12">
        <PageHeader
          eyebrow={
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden
                className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"
              />
              Operator console
            </span>
          }
          title="Admin overview"
          description="Platform pulse, inventory, and the last 24 hours of signal — at a glance."
          actions={
            <>
              <span className="inline-flex items-center gap-2 bg-primary/10 text-primary font-label text-xs px-3 py-1.5 rounded-full border border-primary/30 uppercase tracking-widest font-semibold">
                <Icon name="verified_user" className="text-[14px]" />
                {user.email}
              </span>
              <Link
                to="/app"
                className="inline-flex items-center gap-2 border border-outline-variant/30 text-on-surface font-headline px-5 py-2.5 rounded-lg hover:bg-surface-container-low transition-colors"
              >
                <Icon name="arrow_back" className="text-base" />
                Back to app
              </Link>
            </>
          }
        />

        {/* Topline metrics -------------------------------------------- */}
        <section>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon="group"
              label="Total users"
              value={stats.users.total}
              hint={`${stats.users.onboarded} onboarded · ${stats.users.newLast30d} new in 30d`}
              tone="accent"
            />
            <StatCard
              icon="workspaces"
              label="Live roles"
              value={stats.jobs.published}
              hint={`${stats.jobs.draft} draft · ${stats.jobs.archived} archived`}
            />
            <StatCard
              icon="list_alt"
              label="Applications"
              value={stats.applications.total}
              hint={`${stats.applications.active} active · ${stats.applications.last7d} this week`}
            />
            <StatCard
              icon="diamond"
              label="Active subs"
              value={stats.subscriptions.active}
              hint={`${stats.subscriptions.canceled} canceled · ${stats.roleUnlocks} role unlocks`}
              tone={stats.subscriptions.active > 0 ? "accent" : "default"}
            />
          </div>
        </section>

        {/* Main two-column grid --------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          <div className="space-y-10">
            {/* Activity in last 24h ------------------------------ */}
            <section>
              <SectionHeader
                eyebrow="Last 24 hours"
                title="Live signal"
                description="Real-time engagement across the catalog."
              />
              <div className="grid grid-cols-3 gap-4">
                <ActivityBlock
                  icon="visibility"
                  label="Job views"
                  value={stats.activity24h.views}
                />
                <ActivityBlock
                  icon="lock_open"
                  label="Unlocks"
                  value={stats.activity24h.unlocks}
                  tone="accent"
                />
                <ActivityBlock
                  icon="send"
                  label="Applies"
                  value={stats.activity24h.applies}
                  tone="accent"
                />
              </div>
            </section>

            {/* Recent jobs -------------------------------------- */}
            <section>
              <SectionHeader
                eyebrow="Catalog"
                title="Recent roles"
                description="The five most recent listings, ordered by posted date."
                cta={
                  <span className="font-label text-xs uppercase tracking-widest text-outline-variant">
                    Inventory · {stats.jobs.total}
                  </span>
                }
              />
              {stats.recentJobs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-outline-variant/25 px-6 py-10 text-center">
                  <Icon name="inventory_2" className="text-3xl text-outline mb-3" />
                  <div className="font-headline text-base text-primary mb-1">
                    No roles posted yet
                  </div>
                  <p className="font-body text-sm text-on-surface-variant">
                    Seed or create a job to see it here.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-outline-variant/10 rounded-xl border border-outline-variant/15 bg-surface-container-lowest overflow-hidden">
                  {stats.recentJobs.map((j) => (
                    <li key={j._id}>
                      <Link
                        to={`/jobs/${j._id}`}
                        className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-surface-container-low transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="font-headline text-base font-semibold text-primary truncate">
                            {j.title}
                          </div>
                          <div className="flex items-center gap-2 mt-1 font-body text-xs text-on-surface-variant">
                            <Icon name="domain" className="text-sm" />
                            <span className="truncate">{j.companyName}</span>
                            <span className="text-outline-variant/50">·</span>
                            <span>{relativeTime(j.postedAt, now)}</span>
                          </div>
                        </div>
                        <StatusPill tone={statusTone[j.status]}>
                          {statusLabel[j.status]}
                        </StatusPill>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Distribution ------------------------------------- */}
            <section>
              <SectionHeader
                eyebrow="Audience"
                title="User mix"
                description="How users self-described during onboarding."
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DistributionBar
                  icon="person_search"
                  label="Candidates"
                  value={stats.users.candidates}
                  total={stats.users.total}
                />
                <DistributionBar
                  icon="campaign"
                  label="Recruiters"
                  value={stats.users.recruiters}
                  total={stats.users.total}
                />
              </div>
            </section>
          </div>

          {/* Right column ---------------------------------------- */}
          <aside className="space-y-6">
            <section className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-6">
              <div className="font-label text-[10px] uppercase tracking-[0.28em] text-outline-variant mb-4">
                Inventory
              </div>
              <div className="space-y-3">
                <MiniStat
                  icon="business"
                  label="Companies"
                  value={stats.companies}
                />
                <MiniStat
                  icon="category"
                  label="Categories"
                  value={stats.categories}
                />
                <MiniStat
                  icon="edit_note"
                  label="Draft jobs"
                  value={stats.jobs.draft}
                />
                <MiniStat
                  icon="archive"
                  label="Archived jobs"
                  value={stats.jobs.archived}
                />
                <MiniStat
                  icon="upload"
                  label="Posted in 7d"
                  value={stats.jobs.postedLast7d}
                  accent
                />
              </div>
            </section>

            <section className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-6">
              <div className="font-label text-[10px] uppercase tracking-[0.28em] text-outline-variant mb-4">
                Quick actions
              </div>
              <div className="space-y-2">
                <Link to="/admin/jobs">
                  <ActionRow
                    icon="workspaces"
                    label="Manage jobs"
                    hint="Create, edit, publish, and archive"
                  />
                </Link>
                <ActionRow
                  icon="business"
                  label="Companies"
                  hint="Owned logos and profiles"
                  disabled
                />
                <ActionRow
                  icon="insights"
                  label="Detailed analytics"
                  hint="Coming soon"
                  disabled
                />
              </div>
            </section>

            <section className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-6">
              <div className="font-label text-[10px] uppercase tracking-[0.28em] text-outline-variant mb-3">
                System
              </div>
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 text-primary flex items-center justify-center shrink-0">
                  <Icon name="shield" className="text-lg" />
                </span>
                <div>
                  <div className="font-headline text-sm font-semibold text-primary">
                    Single-operator mode
                  </div>
                  <p className="font-body text-xs text-on-surface-variant mt-1">
                    Admin access is restricted to a single verified email.
                    Server-side checks re-derive role on every request.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  cta,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div>
        <div className="font-label text-[10px] uppercase tracking-[0.28em] text-outline-variant mb-2">
          {eyebrow}
        </div>
        <h2 className="font-headline text-xl md:text-2xl font-bold tracking-tight text-primary">
          {title}
        </h2>
        {description ? (
          <p className="font-body text-sm text-on-surface-variant mt-1 max-w-xl">
            {description}
          </p>
        ) : null}
      </div>
      {cta}
    </div>
  );
}

function ActivityBlock({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: string;
  label: string;
  value: number;
  tone?: "default" | "accent";
}) {
  return (
    <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="font-label text-[10px] uppercase tracking-[0.25em] text-outline-variant">
          {label}
        </div>
        <span
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center border",
            tone === "accent"
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-surface-container border-outline-variant/20 text-on-surface-variant",
          )}
        >
          <Icon name={icon} className="text-base" />
        </span>
      </div>
      <div className="font-headline text-2xl md:text-3xl font-bold tracking-tighter text-primary tabular-nums">
        {value}
      </div>
    </div>
  );
}

function DistributionBar({
  icon,
  label,
  value,
  total,
}: {
  icon: string;
  label: string;
  value: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon name={icon} className="text-base text-on-surface-variant" />
          <span className="font-headline text-sm font-semibold text-primary">
            {label}
          </span>
        </div>
        <span className="font-label text-xs text-on-surface-variant tabular-nums">
          {value} · {pct}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
        <div
          className="h-full bg-primary/60"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center border shrink-0",
            accent
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-surface-container border-outline-variant/20 text-on-surface-variant",
          )}
        >
          <Icon name={icon} className="text-base" />
        </span>
        <span className="font-body text-sm text-on-surface truncate">
          {label}
        </span>
      </div>
      <span className="font-headline text-sm font-semibold text-primary tabular-nums">
        {value}
      </span>
    </div>
  );
}

function StatusPill({
  tone,
  children,
}: {
  tone: "neutral" | "active" | "muted";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "font-label text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full border whitespace-nowrap",
        tone === "active" && "text-primary bg-primary/10 border-primary/30",
        tone === "neutral" &&
          "text-on-surface bg-surface-container-high border-outline-variant/30",
        tone === "muted" &&
          "text-on-surface-variant bg-surface-container border-outline-variant/20",
      )}
    >
      {children}
    </span>
  );
}

function ActionRow({
  icon,
  label,
  hint,
  disabled,
}: {
  icon: string;
  label: string;
  hint: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-outline-variant/15 bg-surface-container-lowest/70 px-3 py-3",
        disabled && "opacity-60 cursor-not-allowed",
      )}
    >
      <span className="w-9 h-9 rounded-lg bg-surface-container border border-outline-variant/20 flex items-center justify-center text-primary shrink-0">
        <Icon name={icon} className="text-lg" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-headline text-sm font-semibold text-primary">
          {label}
        </div>
        <div className="font-body text-xs text-on-surface-variant truncate">
          {hint}
        </div>
      </div>
      {disabled ? (
        <span className="font-label text-[10px] uppercase tracking-[0.22em] text-outline-variant">
          Soon
        </span>
      ) : null}
    </div>
  );
}

function relativeTime(ts: number, now: number): string {
  const diff = Math.max(0, now - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(ts).toLocaleDateString();
}
