import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/app/PageHeader";
import { FullPageLoader } from "@/components/auth/FullPageLoader";
import { cn } from "@/lib/utils";

type AdminJob = FunctionReturnType<typeof api.jobs.adminList>[number];

const statusConfig: Record<
  AdminJob["status"],
  { label: string; tone: string }
> = {
  draft: {
    label: "Draft",
    tone: "text-on-surface-variant bg-surface-container border-outline-variant/20",
  },
  published: {
    label: "Live",
    tone: "text-primary bg-primary/10 border-primary/30",
  },
  archived: {
    label: "Archived",
    tone: "text-outline-variant bg-surface-container border-outline-variant/15",
  },
};

const levelLabel: Record<string, string> = {
  intern: "Intern",
  entry: "Entry",
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  staff: "Staff",
  principal: "Principal",
};

function relativeTime(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
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

export function AdminJobs() {
  const jobs = useQuery(api.jobs.adminList, {});
  const archiveJob = useMutation(api.jobs.adminArchive);
  const deleteJob = useMutation(api.jobs.adminDelete);
  const updateJob = useMutation(api.jobs.adminUpdate);
  const navigate = useNavigate();

  const [confirmDelete, setConfirmDelete] = useState<Id<"jobs"> | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  if (jobs === undefined) {
    return <FullPageLoader label="Loading jobs" />;
  }

  const filtered =
    statusFilter === "all"
      ? jobs
      : jobs.filter((j) => j.status === statusFilter);

  const counts = {
    all: jobs.length,
    published: jobs.filter((j) => j.status === "published").length,
    draft: jobs.filter((j) => j.status === "draft").length,
    archived: jobs.filter((j) => j.status === "archived").length,
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-10 md:py-14 space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <Link
              to="/admin"
              className="hover:text-primary transition-colors"
            >
              Admin
            </Link>
            <span className="text-outline-variant/40">/</span>
            Jobs
          </span>
        }
        title="Job management"
        description="Create, edit, publish, and archive job listings."
        actions={
          <Link
            to="/admin/jobs/new"
            className="inline-flex items-center gap-2 bg-primary text-on-primary font-headline px-4 sm:px-5 py-2.5 rounded-lg hover:bg-primary-container transition-colors text-sm sm:text-base"
          >
            <Icon name="add" className="text-base" />
            Create Job
          </Link>
        }
      />

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {(["all", "published", "draft", "archived"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setStatusFilter(f)}
            className={cn(
              "font-label text-xs uppercase tracking-widest px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap",
              statusFilter === f
                ? "bg-primary text-on-primary border-primary"
                : "bg-transparent text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-low",
            )}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}{" "}
            <span className="opacity-60">
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* Job list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-outline-variant/25 px-6 py-12 text-center">
          <Icon name="inventory_2" className="text-4xl text-outline mb-3" />
          <div className="font-headline text-base text-primary mb-1">
            No jobs found
          </div>
          <p className="font-body text-sm text-on-surface-variant mb-6">
            {statusFilter === "all"
              ? "Create your first job listing."
              : `No ${statusFilter} jobs.`}
          </p>
          <Link
            to="/admin/jobs/new"
            className="inline-flex items-center gap-2 bg-primary text-on-primary font-label px-5 py-2.5 rounded-md text-sm"
          >
            <Icon name="add" />
            Create Job
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest overflow-hidden">
          {/* Table header (desktop) */}
          <div className="hidden md:grid grid-cols-[1fr_140px_100px_100px_120px_80px] gap-4 px-5 py-3 border-b border-outline-variant/10 font-label text-[10px] uppercase tracking-[0.2em] text-outline-variant">
            <span>Job</span>
            <span>Company</span>
            <span>Level</span>
            <span>Status</span>
            <span>Posted</span>
            <span className="text-right">Actions</span>
          </div>

          <ul className="divide-y divide-outline-variant/10">
            {filtered.map((j) => (
              <li key={j._id}>
                <div className="flex flex-col md:grid md:grid-cols-[1fr_140px_100px_100px_120px_80px] gap-2 md:gap-4 px-4 sm:px-5 py-3 sm:py-4 hover:bg-surface-container-low transition-colors items-start md:items-center">
                  {/* Title */}
                  <div className="min-w-0">
                    <Link
                      to={`/admin/jobs/${j._id}/edit`}
                      className="font-headline text-sm font-semibold text-primary truncate block hover:underline"
                    >
                      {j.title}
                    </Link>
                    <div className="font-body text-xs text-on-surface-variant truncate mt-0.5 md:hidden">
                      {j.companyName} · {levelLabel[j.level]} · {relativeTime(j.postedAt)}
                    </div>
                  </div>

                  {/* Company (desktop) */}
                  <span className="hidden md:block font-body text-xs text-on-surface-variant truncate">
                    {j.companyName}
                  </span>

                  {/* Level (desktop) */}
                  <span className="hidden md:block font-label text-xs text-on-surface-variant">
                    {levelLabel[j.level]}
                  </span>

                  {/* Status */}
                  <div className="md:block">
                    <span
                      className={cn(
                        "font-label text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full border inline-block",
                        statusConfig[j.status].tone,
                      )}
                    >
                      {statusConfig[j.status].label}
                    </span>
                  </div>

                  {/* Posted (desktop) */}
                  <span className="hidden md:block font-label text-xs text-outline-variant">
                    {relativeTime(j.postedAt)}
                  </span>

                  {/* Actions */}
                  <div className="flex gap-1 md:justify-end">
                    <button
                      type="button"
                      title="Edit"
                      onClick={() => navigate(`/admin/jobs/${j._id}/edit`)}
                      className="w-8 h-8 rounded-md flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
                    >
                      <Icon name="edit" className="text-sm" />
                    </button>
                    {j.status === "draft" && (
                      <button
                        type="button"
                        title="Publish"
                        onClick={() =>
                          updateJob({ id: j._id, ...j, status: "published" })
                        }
                        className="w-8 h-8 rounded-md flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Icon name="publish" className="text-sm" />
                      </button>
                    )}
                    {j.status === "published" && (
                      <button
                        type="button"
                        title="Archive"
                        onClick={() => archiveJob({ id: j._id })}
                        className="w-8 h-8 rounded-md flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
                      >
                        <Icon name="archive" className="text-sm" />
                      </button>
                    )}
                    {confirmDelete === j._id ? (
                      <button
                        type="button"
                        title="Confirm delete"
                        onClick={() => {
                          deleteJob({ id: j._id });
                          setConfirmDelete(null);
                        }}
                        className="w-8 h-8 rounded-md flex items-center justify-center text-red-400 hover:bg-red-400/10 transition-colors animate-pulse"
                      >
                        <Icon name="check" className="text-sm" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => setConfirmDelete(j._id)}
                        className="w-8 h-8 rounded-md flex items-center justify-center text-on-surface-variant hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <Icon name="delete" className="text-sm" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
