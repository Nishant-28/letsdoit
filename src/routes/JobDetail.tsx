import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Icon } from "@/components/Icon";
import { startPayuCheckout } from "@/lib/payu";
import { trackEvent } from "@/lib/posthog";
import { cn } from "@/lib/utils";

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
  const navigate = useNavigate();

  const me = useQuery(api.users.me, {});
  const job = useQuery(
    api.jobs.getById,
    id ? { id: id as Id<"jobs"> } : "skip",
  );
  const recordView = useMutation(api.jobEvents.recordView);
  const createOrder = useAction(api.payments.createOrder);

  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const viewedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!id || !job) return;
    if (viewedRef.current === id) return;
    viewedRef.current = id;
    trackEvent("job_viewed", { job_id: id, title: job.title });
    recordView({ jobId: id as Id<"jobs"> }).catch(() => {
      viewedRef.current = null;
    });
  }, [id, job, recordView]);

  // Dynamic page title for SEO / sharing
  useEffect(() => {
    if (job && job.title) {
      document.title = `${job.title} — Let's Do It`;
    } else {
      document.title = "Let's Do It — Jobs for Freshers";
    }
    return () => {
      document.title = "Let's Do It — Jobs for Freshers";
    };
  }, [job]);

  if (!id) return null;
  if (job === undefined) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-16 sm:py-32">
        <div className="h-8 w-1/2 bg-surface-container animate-pulse rounded mb-4" />
        <div className="h-4 w-1/3 bg-surface-container animate-pulse rounded mb-8" />
        <div className="h-64 bg-surface-container animate-pulse rounded" />
      </div>
    );
  }
  if (job === null) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-16 sm:py-32 text-center">
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

  const unlocked = job.unlocked;

  const onUnlock = async () => {
    if (!id || !job) return;
    setCheckoutError(null);
    if (!me) {
      navigate(`/login?redirect=${encodeURIComponent(`/jobs/${id}`)}`);
      return;
    }
    if (!me.onboarded) {
      navigate("/onboarding");
      return;
    }
    setStarting(true);
    try {
      trackEvent("job_unlock_checkout_started", {
        job_id: id,
        title: job.title,
      });
      const { paymentUrl, fields } = await createOrder({
        productType: "job_unlock",
        jobId: id as Id<"jobs">,
      });
      startPayuCheckout({
        paymentUrl,
        fields,
      });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not start checkout.";
      if (message.toLowerCase().includes("not authenticated")) {
        navigate(`/login?redirect=${encodeURIComponent(`/jobs/${id}`)}`);
        return;
      }
      setCheckoutError(message);
      setStarting(false);
    }
  };

  const onApply = () => {
    if (!job.applyUrl) return;
    trackEvent("job_applied", { job_id: id, title: job.title });
    window.open(job.applyUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-16">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary mb-6 sm:mb-8 font-label text-sm"
      >
        <Icon name="arrow_back" className="text-base" /> Back to Explore
      </Link>

      {/* Header ---------------------------------------------------- */}
      <header className="flex flex-col gap-4 sm:gap-6 mb-8 sm:mb-12 pb-6 sm:pb-8 border-b border-outline-variant/15">
        <div className="flex items-start gap-4 sm:gap-6">
          <div className="bg-surface p-3 sm:p-4 rounded-lg shadow-sm border border-outline-variant/20 shrink-0">
            {unlocked && job.companyLogoUrl ? (
              <img
                src={job.companyLogoUrl}
                alt={`${job.companyName ?? ""} logo`}
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-md object-cover grayscale opacity-80"
              />
            ) : (
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-md bg-surface-container-high flex items-center justify-center">
                <Icon
                  name="lock"
                  className="text-on-surface-variant text-xl sm:text-2xl"
                />
              </div>
            )}
          </div>
          <div className="flex-grow min-w-0">
            <h1 className="font-headline text-2xl sm:text-4xl md:text-5xl font-bold text-primary mb-2 sm:mb-3 tracking-tighter">
              {job.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-on-surface-variant text-xs sm:text-sm font-body">
              <span className="flex items-center gap-1">
                <Icon name="domain" className="text-[16px] sm:text-[18px]" />
                {unlocked ? (
                  job.companyName ?? "—"
                ) : (
                  <span className="text-outline-variant italic">
                    Unlock to reveal
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1">
                <Icon
                  name="location_on"
                  className="text-[16px] sm:text-[18px]"
                />
                {unlocked ? (
                  job.location ?? "—"
                ) : (
                  <span className="text-outline-variant italic">
                    Unlock to reveal
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1">
                <Icon name="work" className="text-[16px] sm:text-[18px]" />
                {levelLabel[job.level] ?? job.level}
              </span>
              <span className="flex items-center gap-1">
                <Icon
                  name="travel_explore"
                  className="text-[16px] sm:text-[18px]"
                />
                {job.workMode}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {job.skills.map((s) => (
            <span
              key={s}
              className="bg-surface-container-high text-on-surface font-label text-xs px-3 py-1 rounded-md border border-outline-variant/30"
            >
              {s}
            </span>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          {unlocked ? (
            <button
              type="button"
              onClick={onApply}
              className="w-full sm:w-auto bg-primary text-on-primary font-headline font-semibold px-6 py-3 rounded-md hover:bg-primary-container transition-colors inline-flex items-center justify-center gap-2"
            >
              <Icon name="open_in_new" />
              Apply Now
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onUnlock}
                disabled={starting}
                className="w-full sm:w-auto bg-primary text-on-primary font-headline font-semibold px-6 py-3 rounded-md hover:bg-primary-container transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {starting ? (
                  <>
                    <span className="relative w-4 h-4">
                      <span className="absolute inset-0 rounded-full border border-on-primary/30" />
                      <span className="absolute inset-0 rounded-full border-t border-on-primary animate-spin" />
                    </span>
                    Starting checkout
                  </>
                ) : (
                  <>
                    <Icon name="lock_open" />
                    Unlock for ₹{(job.unlockPricePaise / 100).toFixed(0)}
                  </>
                )}
              </button>
              <Link
                to="/pricing"
                className="w-full sm:w-auto border border-outline-variant/30 text-on-surface font-headline font-medium px-6 py-3 rounded-md hover:bg-surface-container-low transition-colors inline-flex items-center justify-center gap-2"
              >
                <Icon name="diamond" />
                Subscribe to see all
              </Link>
            </>
          )}
        </div>
        {checkoutError ? (
          <div className="rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error flex items-start gap-3">
            <Icon name="error" className="text-base mt-0.5" />
            <span>{checkoutError}</span>
          </div>
        ) : null}
      </header>

      {/* Description ------------------------------------------------ */}
      {unlocked ? (
        <article className="max-w-none font-body">
          <h2 className="font-headline text-xl sm:text-2xl text-primary mb-4">
            Role Description
          </h2>
          <div className="text-on-surface whitespace-pre-line leading-relaxed text-sm sm:text-base">
            {job.descriptionMd ?? "(No description provided.)"}
          </div>
        </article>
      ) : (
        <LockedOverlay
          pricePaise={job.unlockPricePaise}
          onUnlock={onUnlock}
          starting={starting}
        />
      )}
    </div>
  );
}

function LockedOverlay({
  pricePaise,
  onUnlock,
  starting,
}: {
  pricePaise: number;
  onUnlock: () => void;
  starting: boolean;
}) {
  return (
    <div className="relative">
      {/* Blurred fake content */}
      <div className="select-none pointer-events-none" aria-hidden>
        <div className="space-y-3 blur-md opacity-40">
          <div className="h-4 bg-surface-container-high rounded w-full" />
          <div className="h-4 bg-surface-container-high rounded w-5/6" />
          <div className="h-4 bg-surface-container-high rounded w-4/6" />
          <div className="h-4 bg-surface-container-high rounded w-full" />
          <div className="h-4 bg-surface-container-high rounded w-3/4" />
          <div className="h-4 bg-surface-container-high rounded w-5/6" />
          <div className="h-4 bg-surface-container-high rounded w-2/3" />
          <div className="h-4 bg-surface-container-high rounded w-full" />
        </div>
      </div>

      {/* Paywall CTA overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-6 sm:p-10 text-center max-w-md shadow-2xl">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Icon name="lock" className="text-3xl text-primary" />
          </div>
          <h3 className="font-headline text-xl sm:text-2xl font-bold text-primary mb-2">
            This job is locked
          </h3>
          <p className="font-body text-sm text-on-surface-variant mb-6">
            Unlock to see the full description, company details, location, and
            apply link.
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={onUnlock}
              disabled={starting}
              className="w-full bg-primary text-on-primary font-headline font-semibold px-6 py-3 rounded-lg hover:bg-primary-container transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {starting ? (
                <>
                  <span className="relative w-4 h-4">
                    <span className="absolute inset-0 rounded-full border border-on-primary/30" />
                    <span className="absolute inset-0 rounded-full border-t border-on-primary animate-spin" />
                  </span>
                  Starting checkout
                </>
              ) : (
                <>
                  <Icon name="lock_open" />
                  Unlock for ₹{(pricePaise / 100).toFixed(0)}
                </>
              )}
            </button>
            <Link
              to="/pricing"
              className="w-full border border-primary/30 text-primary font-headline font-medium px-6 py-3 rounded-lg hover:bg-primary/5 transition-colors inline-flex items-center justify-center gap-2"
            >
              <Icon name="diamond" />
              Subscribe — unlock all jobs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
