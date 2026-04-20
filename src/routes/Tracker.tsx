import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

const COLUMNS: Array<{
  status: "saved" | "applied" | "interviewing" | "offer" | "rejected";
  label: string;
  icon: string;
}> = [
  { status: "saved", label: "Saved", icon: "bookmark" },
  { status: "applied", label: "Applied", icon: "send" },
  { status: "interviewing", label: "Interviewing", icon: "forum" },
  { status: "offer", label: "Offer", icon: "celebration" },
  { status: "rejected", label: "Rejected", icon: "block" },
];

export function Tracker() {
  const apps = useQuery(api.applications.mine, {});
  const setStatus = useMutation(api.applications.setStatus);
  const remove = useMutation(api.applications.remove);

  return (
    <div className="max-w-screen-2xl mx-auto px-8 py-16">
      <header className="mb-12">
        <div className="font-label text-xs uppercase tracking-widest text-primary mb-2">
          Your Pipeline
        </div>
        <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tighter text-primary mb-2">
          Tracker
        </h1>
        <p className="font-body text-on-surface-variant">
          Lightweight progress board — drag the status of any role you've
          saved or applied to.
        </p>
      </header>

      {apps === undefined ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {COLUMNS.map((c) => (
            <div
              key={c.status}
              className="bg-surface-container-low h-64 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : apps.length === 0 ? (
        <EmptyTracker />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {COLUMNS.map((col) => {
            const items = apps.filter((a) => a.status === col.status);
            return (
              <section
                key={col.status}
                className="bg-surface-container-low rounded-xl border border-outline-variant/15 flex flex-col min-h-[260px]"
              >
                <header className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/10">
                  <div className="flex items-center gap-2 text-on-surface">
                    <Icon name={col.icon} className="text-base" />
                    <span className="font-label text-xs uppercase tracking-widest">
                      {col.label}
                    </span>
                  </div>
                  <span className="text-on-surface-variant text-xs font-label">
                    {items.length}
                  </span>
                </header>
                <div className="p-3 space-y-2 flex-grow">
                  {items.length === 0 ? (
                    <div className="text-on-surface-variant text-xs font-label py-6 text-center">
                      Empty
                    </div>
                  ) : (
                    items.map((a) => (
                      <article
                        key={a._id}
                        className="bg-surface-container-lowest border border-outline-variant/15 rounded-lg p-3"
                      >
                        <Link
                          to={`/jobs/${a.jobId}`}
                          className="block font-headline text-primary text-sm mb-1 hover:underline"
                        >
                          {a.jobTitle}
                        </Link>
                        <div
                          className={cn(
                            "text-on-surface-variant text-xs mb-3",
                            !a.unlocked && "blur-[2px] select-none",
                          )}
                        >
                          {a.unlocked
                            ? `${a.companyName ?? "—"} · ${a.location ?? ""}`
                            : "Hidden Company · Hidden Location"}
                        </div>
                        <div className="flex items-center justify-between">
                          <select
                            className="bg-surface-container text-on-surface text-xs rounded px-2 py-1 border border-outline-variant/20"
                            value={a.status}
                            onChange={(e) =>
                              setStatus({
                                jobId: a.jobId,
                                status: e.target
                                  .value as typeof a.status,
                              })
                            }
                          >
                            {COLUMNS.map((c) => (
                              <option key={c.status} value={c.status}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => remove({ id: a._id })}
                            className="text-outline hover:text-error p-1"
                            aria-label="Remove from tracker"
                          >
                            <Icon name="close" className="text-base" />
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyTracker() {
  return (
    <div className="bg-surface-container-low border border-outline-variant/15 rounded-xl p-16 text-center">
      <Icon name="dashboard_customize" className="text-5xl text-outline mb-4" />
      <h2 className="font-headline text-2xl text-primary mb-2">
        Your tracker is empty.
      </h2>
      <p className="text-on-surface-variant mb-8">
        Open any role and tap "Save to Tracker" or "Apply" to start tracking
        progress.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-md font-label"
      >
        <Icon name="explore" /> Browse roles
      </Link>
    </div>
  );
}
