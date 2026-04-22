import { useCallback } from "react";
import { Link } from "react-router";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
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

export function JobCard({
  job,
  isSaved = false,
}: {
  job: JobRow;
  isSaved?: boolean;
}) {
  const isNew = Date.now() - job.postedAt < 1000 * 60 * 60 * 24;
  const unlocked = job.unlocked;

  const recordClick = useMutation(api.jobEvents.recordClick);
  const toggleSaved = useMutation(api.savedJobs.toggleSaved);

  const handleClick = useCallback(() => {
    recordClick({ jobId: job._id }).catch(() => {});
  }, [job._id, recordClick]);

  const handleSave = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toggleSaved({ jobId: job._id }).catch(() => {});
    },
    [job._id, toggleSaved],
  );

  return (
    <Link
      to={`/jobs/${job._id}`}
      onClick={handleClick}
      className="bg-surface-container-lowest border border-outline-variant/15 p-4 sm:p-6 lg:p-8 rounded-xl hover:bg-surface-container-low transition-colors duration-300 flex flex-col sm:flex-row gap-4 sm:gap-6 lg:gap-8 items-start sm:items-center relative group"
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity rounded-l-xl" />

      {/* Logo */}
      <div className="bg-surface p-3 sm:p-4 rounded-lg shadow-sm border border-outline-variant/20 shrink-0">
        {unlocked && job.companyLogoUrl ? (
          <img
            alt={`${job.companyName ?? ""} logo`}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-md object-cover grayscale opacity-80"
            src={job.companyLogoUrl}
          />
        ) : (
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-surface-container-high flex items-center justify-center">
            <Icon
              name="lock"
              className="text-on-surface-variant text-lg sm:text-xl"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-grow min-w-0">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
          <h3 className="font-headline text-lg sm:text-xl lg:text-2xl font-bold text-primary truncate">
            {job.title}
          </h3>
          {isNew ? (
            <span className="bg-primary/10 text-primary font-label text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full uppercase tracking-widest font-semibold">
              New
            </span>
          ) : null}
          {!unlocked ? (
            <span className="inline-flex items-center gap-1 bg-surface-container-high text-on-surface-variant font-label text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full uppercase tracking-widest font-semibold">
              <Icon name="lock" className="text-[12px] sm:text-[14px]" />
              Locked
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 font-body text-on-surface-variant text-xs sm:text-sm">
          <span className="flex items-center gap-1">
            <Icon name="domain" className="text-[16px] sm:text-[18px]" />
            {unlocked ? (
              job.companyName
            ) : (
              <span className="text-outline-variant italic text-xs">
                Unlock to reveal
              </span>
            )}
          </span>
          <span className="flex items-center gap-1">
            <Icon name="location_on" className="text-[16px] sm:text-[18px]" />
            {unlocked ? (
              job.location
            ) : (
              <span className="text-outline-variant italic text-xs">
                Unlock to reveal
              </span>
            )}
          </span>
          <span className="flex items-center gap-1">
            <Icon name="work" className="text-[16px] sm:text-[18px]" />
            {levelLabel[job.level]}
          </span>
        </div>
      </div>

      {/* Skills + meta */}
      <div className="flex flex-wrap sm:flex-col gap-2 sm:min-w-[160px] lg:min-w-[200px] sm:items-end">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {job.skills.slice(0, 3).map((s) => (
            <span
              key={s}
              className="bg-surface-container-high text-on-surface font-label text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-md border border-outline-variant/30"
            >
              {s}
            </span>
          ))}
        </div>
        <span className="font-label text-[10px] sm:text-xs text-outline sm:mt-2">
          Posted {timeAgo(job.postedAt)}
        </span>
      </div>

      {/* Save + arrow */}
      <div className="hidden sm:flex items-center gap-2 ml-auto">
        <button
          type="button"
          onClick={handleSave}
          title={isSaved ? "Unsave" : "Save"}
          className={cn(
            "w-10 h-10 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-all duration-300",
            isSaved
              ? "bg-primary/10 border-primary/30 text-primary"
              : "border-outline-variant/30 text-on-surface-variant hover:border-primary/40 hover:text-primary",
          )}
        >
          <Icon
            name={isSaved ? "bookmark" : "bookmark_border"}
            className="text-lg"
          />
        </button>
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-outline-variant/30 flex items-center justify-center text-on-surface group-hover:bg-primary group-hover:text-on-primary group-hover:border-primary transition-all duration-300">
          <Icon name={unlocked ? "arrow_forward" : "lock_open"} />
        </div>
      </div>

      {/* Mobile bottom bar: save + arrow */}
      <div className="flex sm:hidden items-center justify-between w-full pt-2 border-t border-outline-variant/10">
        <button
          type="button"
          onClick={handleSave}
          className={cn(
            "flex items-center gap-1.5 text-xs font-label",
            isSaved ? "text-primary" : "text-on-surface-variant",
          )}
        >
          <Icon
            name={isSaved ? "bookmark" : "bookmark_border"}
            className="text-base"
          />
          {isSaved ? "Saved" : "Save"}
        </button>
        <div className="flex items-center gap-1.5 text-xs font-label text-on-surface-variant">
          {unlocked ? "View details" : `Unlock ₹${(job.unlockPricePaise / 100).toFixed(0)}`}
          <Icon
            name={unlocked ? "arrow_forward" : "lock_open"}
            className="text-base"
          />
        </div>
      </div>
    </Link>
  );
}

// Need to import api for the mutations
import { api } from "../../convex/_generated/api";
