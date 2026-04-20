import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/Icon";
import { PaywallOverlay } from "@/components/PaywallOverlay";
import { UnlockSheet } from "@/components/UnlockSheet";

const levelLabel: Record<string, string> = {
  intern: "Intern",
  entry: "Entry Level",
  junior: "Junior",
  mid: "Mid-Level",
  senior: "Senior",
  staff: "Staff",
  principal: "Principal",
};

export function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);

  const job = useQuery(
    api.jobs.getById,
    id ? { id: id as Id<"jobs"> } : "skip",
  );
  const recordApply = useMutation(api.applications.recordApply);
  const recordView = useMutation(api.jobEvents.recordView);
  const setStatus = useMutation(api.applications.setStatus);

  const viewedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!id) return;
    if (viewedRef.current === id) return;
    viewedRef.current = id;
    recordView({ jobId: id as Id<"jobs"> }).catch(() => {
      viewedRef.current = null;
    });
  }, [id, recordView]);

  if (!id) return null;
  if (job === undefined) {
    return (
      <div className="max-w-4xl mx-auto px-8 py-32">
        <div className="h-8 w-1/2 bg-surface-container animate-pulse rounded mb-4" />
        <div className="h-4 w-1/3 bg-surface-container animate-pulse rounded mb-8" />
        <div className="h-64 bg-surface-container animate-pulse rounded" />
      </div>
    );
  }
  if (job === null) {
    return (
      <div className="max-w-4xl mx-auto px-8 py-32 text-center">
        <h1 className="font-headline text-3xl text-primary mb-2">
          Signal lost.
        </h1>
        <p className="text-on-surface-variant mb-8">
          That role doesn't exist or was archived.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-md font-label"
        >
          <Icon name="arrow_back" /> Back to Explore
        </Link>
      </div>
    );
  }

  const onApply = async () => {
    if (!job.unlocked || !job.applyUrl) return;
    await recordApply({ jobId: job._id });
    window.open(job.applyUrl, "_blank", "noopener,noreferrer");
  };

  const onSave = async () => {
    if (!user) {
      navigate("/login", { state: { from: `/jobs/${id}` } });
      return;
    }
    await setStatus({ jobId: job._id, status: "saved" });
  };

  const onUnlockClick = async () => {
    if (!user) {
      navigate("/login", { state: { from: `/jobs/${id}` } });
      return;
    }
    setSheetOpen(true);
  };

  return (
    <div className="max-w-5xl mx-auto px-8 py-16">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary mb-8 font-label text-sm"
      >
        <Icon name="arrow_back" className="text-base" /> Back to Explore
      </Link>

      <header className="flex flex-col md:flex-row md:items-start gap-6 mb-12 pb-8 border-b border-outline-variant/15">
        <div className="bg-surface p-4 rounded-lg shadow-sm border border-outline-variant/20">
          {job.unlocked && job.companyLogoUrl ? (
            <img
              src={job.companyLogoUrl}
              alt={`${job.companyName ?? ""} logo`}
              className="w-16 h-16 rounded-md object-cover grayscale opacity-80"
            />
          ) : (
            <div className="w-16 h-16 rounded-md bg-surface-container-high flex items-center justify-center">
              <Icon name="lock" className="text-on-surface-variant text-2xl" />
            </div>
          )}
        </div>
        <div className="flex-grow">
          <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary mb-3 tracking-tighter">
            {job.title}
          </h1>
          <div className="flex flex-wrap items-center gap-6 text-on-surface-variant text-sm font-body">
            <span className="flex items-center gap-1">
              <Icon name="domain" className="text-[18px]" />
              <span className={job.unlocked ? "" : "blur-sm select-none"}>
                {job.unlocked ? job.companyName : "Hidden Company"}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <Icon name="location_on" className="text-[18px]" />
              <span className={job.unlocked ? "" : "blur-sm select-none"}>
                {job.unlocked ? job.location : "Hidden Location"}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <Icon name="work" className="text-[18px]" />
              {levelLabel[job.level] ?? job.level}
            </span>
            <span className="flex items-center gap-1">
              <Icon name="travel_explore" className="text-[18px]" />
              {job.workMode}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {job.skills.map((s) => (
              <span
                key={s}
                className="bg-surface-container-high text-on-surface font-label text-xs px-3 py-1 rounded-md border border-outline-variant/30"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          {job.unlocked ? (
            <>
              <button
                type="button"
                onClick={onApply}
                className="bg-primary text-on-primary font-headline font-semibold px-6 py-3 rounded-md hover:bg-primary-container transition-colors inline-flex items-center gap-2"
              >
                <Icon name="open_in_new" />
                Apply
              </button>
              <button
                type="button"
                onClick={onSave}
                className="bg-surface-container-high text-on-surface font-label px-6 py-3 rounded-md hover:bg-surface-container-highest transition-colors inline-flex items-center gap-2"
              >
                <Icon name="bookmark_add" />
                Save to Tracker
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onUnlockClick}
              className="bg-primary text-on-primary font-headline font-semibold px-6 py-3 rounded-md hover:bg-primary-container transition-colors inline-flex items-center gap-2"
            >
              <Icon name="lock_open" />
              {user ? "Unlock Role" : "Sign in to Unlock"}
            </button>
          )}
        </div>
      </header>

      {job.unlocked ? (
        <article className="prose prose-invert max-w-none font-body">
          <h2 className="font-headline text-2xl text-primary mb-4">
            Role Description
          </h2>
          <div className="text-on-surface whitespace-pre-line leading-relaxed">
            {job.descriptionMd ?? "(No description provided.)"}
          </div>
        </article>
      ) : (
        <PaywallOverlay
          pricePaise={job.unlockPricePaise}
          onUnlock={onUnlockClick}
        />
      )}

      <UnlockSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        jobId={job._id}
        jobTitle={job.title}
        unlockPricePaise={job.unlockPricePaise}
      />
    </div>
  );
}
