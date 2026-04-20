import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

export function AdminJobs() {
  const jobs = useQuery(api.jobs.adminList, {});
  const counts = useQuery(api.jobEvents.adminCountsByJob, {});
  const archive = useMutation(api.jobs.adminArchive);
  const del = useMutation(api.jobs.adminDelete);
  const seed = useMutation(api.jobs.seedSampleData);

  const [pendingDelete, setPendingDelete] = useState<{
    id: Id<"jobs">;
    title: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const countsByJob = useMemo(() => {
    const map = new Map<
      string,
      { views: number; unlocks: number; applies: number }
    >();
    for (const c of counts ?? []) {
      map.set(c.jobId as unknown as string, {
        views: c.views,
        unlocks: c.unlocks,
        applies: c.applies,
      });
    }
    return map;
  }, [counts]);

  return (
    <div className="px-10 py-10">
      <header className="flex items-center justify-between mb-10">
        <div>
          <h1 className="font-headline text-3xl font-bold text-primary tracking-tighter">
            Jobs
          </h1>
          <p className="text-on-surface-variant text-sm">
            Create, edit, archive job listings.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => seed({})}
          >
            <Icon name="auto_awesome" className="text-base" />
            Seed samples
          </Button>
          <Button asChild>
            <Link to="/admin/jobs/new">
              <Icon name="add" className="text-base" /> New Job
            </Link>
          </Button>
        </div>
      </header>

      {jobs === undefined ? (
        <div className="bg-surface-container-low animate-pulse h-64 rounded-xl" />
      ) : jobs.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/15 rounded-xl p-12 text-center">
          <Icon name="work_off" className="text-4xl text-outline mb-2" />
          <div className="text-on-surface-variant">No jobs yet.</div>
        </div>
      ) : (
        <div className="bg-surface-container-low border border-outline-variant/15 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-container text-on-surface-variant text-left text-xs uppercase tracking-widest font-label">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Activity</th>
                <th className="px-4 py-3">Posted</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => {
                const c = countsByJob.get(j._id as unknown as string);
                return (
                  <tr
                    key={j._id}
                    className="border-t border-outline-variant/10 hover:bg-surface-container/50"
                  >
                    <td className="px-4 py-3 font-headline text-primary">
                      {j.title}
                    </td>
                    <td className="px-4 py-3 text-on-surface">
                      {j.companyName}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={j.status} />
                    </td>
                    <td className="px-4 py-3 text-on-surface">
                      ${(j.unlockPricePaise / 100).toFixed(0)}
                    </td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant whitespace-nowrap">
                      <span title="Views">👁 {c?.views ?? 0}</span>
                      {" · "}
                      <span title="Unlocks">🔓 {c?.unlocks ?? 0}</span>
                      {" · "}
                      <span title="Applies">✉ {c?.applies ?? 0}</span>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {new Date(j.postedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/admin/jobs/${j._id}`}>Edit</Link>
                      </Button>
                      {j.status !== "archived" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => archive({ id: j._id })}
                        >
                          Archive
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          setPendingDelete({ id: j._id, title: j.title })
                        }
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this job?</DialogTitle>
            <DialogDescription>
              This permanently removes{" "}
              <span className="text-primary">{pendingDelete?.title}</span> and
              every application referencing it will orphan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                if (!pendingDelete) return;
                setDeleting(true);
                try {
                  await del({ id: pendingDelete.id });
                  setPendingDelete(null);
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusPill({ status }: { status: "draft" | "published" | "archived" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md font-label text-xs uppercase tracking-widest",
        status === "published" &&
          "bg-primary/10 text-primary border border-primary/30",
        status === "draft" &&
          "bg-surface-container-high text-on-surface-variant border border-outline-variant/30",
        status === "archived" &&
          "bg-error-container/30 text-error border border-error/30",
      )}
    >
      {status}
    </span>
  );
}
