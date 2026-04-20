import { Link } from "react-router";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

type JobRow = FunctionReturnType<typeof api.jobs.listPublished>[number];

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
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

const levelLabel: Record<JobRow["level"], string> = {
  intern: "Intern",
  entry: "Entry Level",
  junior: "Junior",
  mid: "Mid-Level",
  senior: "Senior",
  staff: "Staff",
  principal: "Principal",
};

export function JobCard({ job }: { job: JobRow }) {
  const isNew = Date.now() - job.postedAt < 1000 * 60 * 60 * 24;
  const unlocked = job.unlocked;

  return (
    <Link
      to={`/jobs/${job._id}`}
      className="bg-surface-container-lowest border border-outline-variant/15 p-8 rounded-xl hover:bg-surface-container-low transition-colors duration-300 flex flex-col lg:flex-row gap-8 items-start lg:items-center relative group"
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity rounded-l-xl" />

      <div className="bg-surface p-4 rounded-lg shadow-sm border border-outline-variant/20">
        {unlocked && job.companyLogoUrl ? (
          <img
            alt={`${job.companyName ?? ""} logo`}
            className="w-12 h-12 rounded-md object-cover grayscale opacity-80"
            src={job.companyLogoUrl}
          />
        ) : (
          <div className="w-12 h-12 rounded-md bg-surface-container-high flex items-center justify-center">
            <Icon name="lock" className="text-on-surface-variant text-xl" />
          </div>
        )}
      </div>

      <div className="flex-grow min-w-0">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h3 className="font-headline text-2xl font-bold text-primary truncate">
            {job.title}
          </h3>
          {isNew ? (
            <span className="bg-primary/10 text-primary font-label text-xs px-3 py-1 rounded-full uppercase tracking-widest font-semibold">
              New Signal
            </span>
          ) : null}
          {!unlocked ? (
            <span className="inline-flex items-center gap-1 bg-surface-container-high text-on-surface-variant font-label text-xs px-3 py-1 rounded-full uppercase tracking-widest font-semibold">
              <Icon name="lock" className="text-[14px]" />
              Locked
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-6 font-body text-on-surface-variant text-sm">
          <span className="flex items-center gap-1">
            <Icon name="domain" className="text-[18px]" />
            <span className={cn(!unlocked && "blur-sm select-none")}>
              {unlocked ? job.companyName : "Hidden Company"}
            </span>
          </span>
          <span className="flex items-center gap-1">
            <Icon name="location_on" className="text-[18px]" />
            <span className={cn(!unlocked && "blur-sm select-none")}>
              {unlocked ? job.location : "Hidden Location"}
            </span>
          </span>
          <span className="flex items-center gap-1">
            <Icon name="work" className="text-[18px]" />
            {levelLabel[job.level]}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap lg:flex-col gap-2 min-w-[200px] lg:items-end">
        <div className="flex flex-wrap gap-2">
          {job.skills.slice(0, 3).map((s) => (
            <span
              key={s}
              className="bg-surface-container-high text-on-surface font-label text-xs px-3 py-1 rounded-md border border-outline-variant/30"
            >
              {s}
            </span>
          ))}
        </div>
        <span className="font-label text-xs text-outline mt-2">
          Posted {timeAgo(job.postedAt)}
        </span>
      </div>

      <div className="ml-auto mt-4 lg:mt-0">
        <div className="w-12 h-12 rounded-full border border-outline-variant/30 flex items-center justify-center text-on-surface group-hover:bg-primary group-hover:text-on-primary group-hover:border-primary transition-all duration-300">
          <Icon name={unlocked ? "arrow_forward" : "lock_open"} />
        </div>
      </div>
    </Link>
  );
}
