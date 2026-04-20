import { useState } from "react";
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

export function AdminCompanies() {
  const companies = useQuery(api.companies.list, {});
  const del = useMutation(api.companies.adminDelete);
  const [pending, setPending] = useState<{
    id: Id<"companies">;
    name: string;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="px-10 py-10">
      <header className="flex items-center justify-between mb-10">
        <div>
          <h1 className="font-headline text-3xl font-bold text-primary tracking-tighter">
            Companies
          </h1>
          <p className="text-on-surface-variant text-sm">
            Admin-managed directory. Jobs pick one of these on creation.
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/companies/new">
            <Icon name="add" className="text-base" /> New Company
          </Link>
        </Button>
      </header>

      {companies === undefined ? (
        <div className="bg-surface-container-low animate-pulse h-64 rounded-xl" />
      ) : companies.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/15 rounded-xl p-12 text-center">
          <Icon name="domain_disabled" className="text-4xl text-outline mb-2" />
          <div className="text-on-surface-variant">No companies yet.</div>
        </div>
      ) : (
        <div className="bg-surface-container-low border border-outline-variant/15 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-container text-on-surface-variant text-left text-xs uppercase tracking-widest font-label">
              <tr>
                <th className="px-4 py-3">Logo</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Website</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr
                  key={c._id}
                  className="border-t border-outline-variant/10 hover:bg-surface-container/50"
                >
                  <td className="px-4 py-3">
                    {c.logoUrl ? (
                      <img
                        src={c.logoUrl}
                        alt={`${c.name} logo`}
                        className="w-10 h-10 rounded-md object-cover border border-outline-variant/20"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-surface-container" />
                    )}
                  </td>
                  <td className="px-4 py-3 font-headline text-primary">
                    {c.name}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant font-mono text-xs">
                    {c.slug}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant truncate max-w-[240px]">
                    {c.websiteUrl ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/admin/companies/${c._id}`}>Edit</Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        setPending({ id: c._id, name: c.name })
                      }
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPending(null);
            setErr(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this company?</DialogTitle>
            <DialogDescription>
              Deleting{" "}
              <span className="text-primary">{pending?.name}</span> will fail
              if any job still references it. Reassign those jobs first.
            </DialogDescription>
          </DialogHeader>
          {err ? (
            <div className="text-sm text-error bg-error-container/20 border border-error/30 rounded-md px-3 py-2">
              {err}
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPending(null);
                setErr(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!pending) return;
                try {
                  await del({ id: pending.id });
                  setPending(null);
                  setErr(null);
                } catch (e: unknown) {
                  setErr(e instanceof Error ? e.message : String(e));
                }
              }}
            >
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
