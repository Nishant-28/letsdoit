import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { FullPageLoader } from "@/components/auth/FullPageLoader";
import { cn } from "@/lib/utils";

type Job = FunctionReturnType<typeof api.jobs.listPublished>[number];
type Application = FunctionReturnType<typeof api.applications.mine>[number];

const applicationTone: Record<
  Application["status"],
  "neutral" | "active" | "good" | "bad"
> = {
  saved: "neutral",
  applied: "active",
  interviewing: "active",
  offer: "good",
  rejected: "bad",
};

const applicationLabel: Record<Application["status"], string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
};

export function AppHome() {
  const navigate = useNavigate();
  const user = useQuery(api.users.me, {});
  const jobs = useQuery(api.jobs.listPublished, { limit: 6 });
  const categories = useQuery(api.categories.list, {});
  const applications = useQuery(api.applications.mine, {});

  useEffect(() => {
    if (user === null) {
      // Authenticated in WorkOS but no Convex `users` row yet — route
      // through callback which will sync + redirect appropriately.
      navigate("/callback", { replace: true });
      return;
    }
    if (user && !user.onboarded) {
      navigate("/onboarding", { replace: true });
    }
  }, [user, navigate]);

  const firstName = useMemo(() => {
    if (!user?.name) return "";
    return user.name.split(" ")[0] ?? "";
  }, [user?.name]);

  const stats = useMemo(() => {
    const openJobs = jobs?.length ?? 0;
    const sectors = categories?.length ?? 0;
    const saved =
      applications?.filter((a) => a.status === "saved").length ?? 0;
    const activeApps =
      applications?.filter((a) =>
        ["applied", "interviewing", "offer"].includes(a.status),
      ).length ?? 0;
    return { openJobs, sectors, saved, activeApps };
  }, [jobs, categories, applications]);

  if (user === undefined) {
    return <FullPageLoader label="Loading your dashboard" />;
  }
  if (user === null) {
    return <FullPageLoader label="Preparing your account" />;
  }
  if (!user.onboarded) {
    return <FullPageLoader label="Routing to onboarding" />;
  }

  return (
    <div className="hero-gradient">
      <div className="max-w-screen-2xl mx-auto px-6 md:px-8 py-10 md:py-14 space-y-12">
        <PageHeader
          eyebrow={
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Home
            </span>
          }
          title={
            firstName ? (
              <>
                Welcome back, <span className="text-on-surface-variant">{firstName}</span>
              </>
            ) : (
              "Your workspace"
            )
          }
          description={
            /* user.intent === "recruiter"
              ? "Track the signal on the roles you're running, surface new candidates, and pick up where you left off."
              : */ "Curated signal from the roles you've been eyeing, the sectors you care about, and what's fresh in the last 24 hours."
          }
          actions={
            <>
              <Link
                to="/"
                className="inline-flex items-center gap-2 bg-primary text-on-primary font-headline font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-container transition-colors"
              >
                <Icon name="travel_explore" className="text-base" />
                Open Explore
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 border border-outline-variant/30 text-on-surface font-headline px-5 py-2.5 rounded-lg hover:bg-surface-container-low transition-colors"
              >
                View pricing
              </Link>
            </>
          }
        />

        {/* Metrics row ------------------------------------------------- */}
        <section>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon="workspaces"
              label="Open roles"
              value={stats.openJobs}
              hint="Live in Explore right now"
              tone="accent"
            />
            <StatCard
              icon="hub"
              label="Discovery nodes"
              value={stats.sectors}
              hint="Categories curated for you"
            />
            <StatCard
              icon="bookmark"
              label="Saved"
              value={stats.saved}
              hint={
                stats.saved === 0
                  ? "Star roles to shortlist them"
                  : "Ready to review"
              }
            />
            <StatCard
              icon="trending_up"
              label="Active pipeline"
              value={stats.activeApps}
              hint={
                stats.activeApps === 0
                  ? "Nothing in flight yet"
                  : "Applications moving forward"
              }
              tone={stats.activeApps > 0 ? "accent" : "default"}
            />
          </div>
        </section>

        {/* Main grid: jobs + side column ------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          {/* Left column: fresh jobs + categories ------------------ */}
          <div className="space-y-10">
            <section>
              <SectionHeader
                eyebrow="Live signal"
                title="Fresh opportunities"
                description="The six most recent roles across every sector."
                cta={
                  <Link
                    to="/"
                    className="font-label text-sm text-primary uppercase tracking-widest flex items-center gap-2 hover:opacity-70 transition-opacity"
                  >
                    View all
                    <Icon name="east" className="text-base" />
                  </Link>
                }
              />

              {jobs === undefined ? (
                <JobListSkeleton />
              ) : jobs.length === 0 ? (
                <EmptyJobs />
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {jobs.map((j) => (
                    <li key={j._id}>
                      <CompactJobCard job={j} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <SectionHeader
                eyebrow="Sectors"
                title="Browse by category"
                description="Narrow the feed to the domain you care about."
              />
              {categories === undefined ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-24 rounded-xl bg-surface-container-lowest border border-outline-variant/15 animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {categories.map((c) => (
                    <Link
                      key={c._id}
                      to="/"
                      className="group relative overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-container-lowest hover:bg-surface-container-low transition-colors p-5"
                    >
                      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Icon name={c.icon} className="text-5xl" />
                      </div>
                      <div className="w-9 h-9 rounded-lg bg-surface-container border border-outline-variant/20 flex items-center justify-center text-primary mb-3">
                        <Icon name={c.icon} className="text-lg" />
                      </div>
                      <div className="font-headline text-sm font-semibold text-primary mb-1">
                        {c.name}
                      </div>
                      <div className="font-body text-xs text-on-surface-variant line-clamp-2">
                        {c.description}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right column: pipeline + quick actions ---------------- */}
          <aside className="space-y-8">
            <section className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-label text-[10px] uppercase tracking-[0.28em] text-outline-variant mb-1">
                    Your pipeline
                  </div>
                  <h3 className="font-headline text-lg font-semibold text-primary">
                    Recent activity
                  </h3>
                </div>
                <Link
                  to="/profile"
                  className="text-xs uppercase tracking-widest text-outline-variant hover:text-primary"
                >
                  Manage
                </Link>
              </div>
              {applications === undefined ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-14 rounded-lg bg-surface-container animate-pulse"
                    />
                  ))}
                </div>
              ) : applications.length === 0 ? (
                <div className="rounded-lg border border-dashed border-outline-variant/25 px-4 py-6 text-center">
                  <Icon
                    name="radio_button_unchecked"
                    className="text-2xl text-outline-variant mb-2"
                  />
                  <div className="font-headline text-sm text-primary mb-1">
                    No applications yet
                  </div>
                  <p className="font-body text-xs text-on-surface-variant">
                    Save or apply to a role and it shows up here.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {applications.slice(0, 5).map((a) => (
                    <li key={a._id}>
                      <ApplicationRow app={a} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-6">
              <div className="font-label text-[10px] uppercase tracking-[0.28em] text-outline-variant mb-4">
                Quick actions
              </div>
              <div className="space-y-2">
                <QuickAction
                  to="/"
                  icon="search"
                  label="Search roles"
                  hint="Full-text + filters"
                />
                <QuickAction
                  to="/profile"
                  icon="tune"
                  label="Tune your profile"
                  hint="Name, intent, contact"
                />
                <QuickAction
                  to="/pricing"
                  icon="diamond"
                  label="Upgrade access"
                  hint="Unlock companies + apply"
                />
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

function CompactJobCard({ job }: { job: Job }) {
  const unlocked = job.unlocked;
  return (
    <Link
      to={`/jobs/${job._id}`}
      className="group block h-full rounded-xl border border-outline-variant/15 bg-surface-container-lowest hover:bg-surface-container-low transition-colors p-5"
    >
      <div className="flex items-start gap-4">
        <div className="bg-surface p-2.5 rounded-lg shadow-sm border border-outline-variant/20 shrink-0">
          {unlocked && job.companyLogoUrl ? (
            <img
              alt={`${job.companyName ?? ""} logo`}
              src={job.companyLogoUrl}
              className="w-10 h-10 rounded-md object-cover grayscale opacity-80"
            />
          ) : (
            <div className="w-10 h-10 rounded-md bg-surface-container-high flex items-center justify-center">
              <Icon
                name={unlocked ? "domain" : "lock"}
                className="text-on-surface-variant text-lg"
              />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-headline text-base font-semibold text-primary truncate group-hover:underline underline-offset-4">
            {job.title}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-on-surface-variant">
            <span className={cn("truncate", !unlocked && "blur-sm select-none")}>
              {unlocked ? job.companyName ?? "—" : "Hidden Company"}
            </span>
            <span className="text-outline-variant/50">·</span>
            <span className="capitalize">{job.workMode}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {job.skills.slice(0, 2).map((s) => (
              <span
                key={s}
                className="bg-surface-container-high text-on-surface font-label text-[10px] px-2 py-0.5 rounded-md border border-outline-variant/30"
              >
                {s}
              </span>
            ))}
            {!unlocked ? (
              <span className="inline-flex items-center gap-1 bg-primary/10 text-primary font-label text-[10px] px-2 py-0.5 rounded-md border border-primary/20">
                <Icon name="lock" className="text-[11px]" />
                Locked
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

function JobListSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-28 rounded-xl bg-surface-container-lowest border border-outline-variant/15 animate-pulse"
        />
      ))}
    </div>
  );
}

function EmptyJobs() {
  return (
    <div className="rounded-xl border border-dashed border-outline-variant/25 px-6 py-10 text-center">
      <Icon name="travel_explore" className="text-3xl text-outline mb-3" />
      <div className="font-headline text-base text-primary mb-1">
        No roles live yet
      </div>
      <p className="font-body text-sm text-on-surface-variant mb-4">
        The Explore feed is quiet. Seed sample data from the public page to try
        things out.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 bg-primary text-on-primary font-headline font-semibold px-4 py-2 rounded-lg hover:bg-primary-container transition-colors"
      >
        Open Explore
        <Icon name="arrow_forward" className="text-base" />
      </Link>
    </div>
  );
}

function ApplicationRow({ app }: { app: Application }) {
  const tone = applicationTone[app.status];
  return (
    <Link
      to={`/jobs/${app.jobId}`}
      className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant/15 bg-surface-container-lowest/70 hover:bg-surface-container-low px-3.5 py-3 transition-colors"
    >
      <div className="min-w-0">
        <div className="font-headline text-sm font-semibold text-primary truncate">
          {app.jobTitle}
        </div>
        <div className="font-body text-xs text-on-surface-variant truncate">
          {app.unlocked
            ? app.companyName ?? "—"
            : "Locked company"}
        </div>
      </div>
      <span
        className={cn(
          "font-label text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full border whitespace-nowrap",
          tone === "good" &&
            "text-primary bg-primary/10 border-primary/30",
          tone === "active" &&
            "text-on-surface bg-surface-container-high border-outline-variant/30",
          tone === "neutral" &&
            "text-on-surface-variant bg-surface-container border-outline-variant/25",
          tone === "bad" &&
            "text-error bg-error/10 border-error/30",
        )}
      >
        {applicationLabel[app.status]}
      </span>
    </Link>
  );
}

function QuickAction({
  to,
  icon,
  label,
  hint,
}: {
  to: string;
  icon: string;
  label: string;
  hint: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-lg border border-outline-variant/15 bg-surface-container-lowest/70 hover:bg-surface-container-low transition-colors px-3 py-3"
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
      <Icon
        name="arrow_forward"
        className="text-base text-outline-variant group-hover:text-primary transition-colors"
      />
    </Link>
  );
}
