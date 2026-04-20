import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@/lib/auth";
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

function fmt(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function Account() {
  const { user, signOut } = useAuth();
  const access = useQuery(api.entitlements.myAccess, {});
  const history = useQuery(api.entitlements.listMine, {});
  const cancelSub = useMutation(api.entitlements.cancelSubscription);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const currentSub = useMemo(() => {
    if (!history) return undefined;
    return history.find(
      (e) => e.kind === "subscription" && e.status === "active",
    );
  }, [history]);

  const roleUnlocks = useMemo(() => {
    if (!history) return [];
    return history.filter((e) => e.kind === "role" && e.status === "active");
  }, [history]);

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-8 py-16">
      <header className="mb-12">
        <div className="font-label text-xs uppercase tracking-widest text-primary mb-2">
          Your Account
        </div>
        <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tighter text-primary mb-2">
          {user.name}
        </h1>
        <p className="font-body text-on-surface-variant">{user.email}</p>
      </header>

      <section className="mb-10 bg-surface-container-low border border-outline-variant/15 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline text-xl text-primary">Profile</h2>
          <Button variant="outline" size="sm" onClick={() => signOut()}>
            <Icon name="logout" className="text-base" /> Sign out
          </Button>
        </div>
        <dl className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-on-surface-variant font-label text-xs uppercase tracking-widest mb-1">
              Name
            </dt>
            <dd className="text-on-surface">{user.name}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant font-label text-xs uppercase tracking-widest mb-1">
              Email
            </dt>
            <dd className="text-on-surface">{user.email}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant font-label text-xs uppercase tracking-widest mb-1">
              Role
            </dt>
            <dd
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-md font-label text-xs uppercase tracking-widest",
                user.role === "admin"
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "bg-surface-container-high text-on-surface-variant border border-outline-variant/30",
              )}
            >
              {user.role}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mb-10 bg-surface-container-low border border-outline-variant/15 rounded-xl p-6">
        <h2 className="font-headline text-xl text-primary mb-4">
          Current subscription
        </h2>
        {history === undefined ? (
          <div className="h-16 bg-surface-container animate-pulse rounded-lg" />
        ) : currentSub ? (
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div>
              <div className="font-headline text-2xl text-primary capitalize">
                {currentSub.planSlug ?? "subscription"}
              </div>
              <div className="text-sm text-on-surface-variant mt-1">
                Started {fmt(currentSub.startsAt)}
                {currentSub.expiresAt
                  ? ` · expires ${fmt(currentSub.expiresAt)}`
                  : ""}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setConfirmCancel(true)}
              className="text-error border-error/40 hover:bg-error/5 hover:text-error"
            >
              Cancel subscription
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div className="text-on-surface-variant text-sm">
              No active subscription.
              {access?.subscriptionExpiresAt ? (
                <>
                  {" Access continues until "}
                  <span className="text-primary">
                    {fmt(access.subscriptionExpiresAt)}
                  </span>
                  .
                </>
              ) : null}
            </div>
            <Button asChild>
              <Link to="/pricing">See plans</Link>
            </Button>
          </div>
        )}
      </section>

      <section className="mb-10 bg-surface-container-low border border-outline-variant/15 rounded-xl p-6">
        <h2 className="font-headline text-xl text-primary mb-4">
          Unlocked roles
        </h2>
        {history === undefined ? (
          <div className="h-16 bg-surface-container animate-pulse rounded-lg" />
        ) : roleUnlocks.length === 0 ? (
          <div className="text-on-surface-variant text-sm">
            No individual role unlocks yet.
          </div>
        ) : (
          <ul className="divide-y divide-outline-variant/10">
            {roleUnlocks.map((e) => (
              <li
                key={e._id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <Link
                    to={`/jobs/${e.jobId}`}
                    className="font-headline text-primary hover:underline"
                  >
                    {e.jobTitle ?? "Role"}
                  </Link>
                  <div className="text-xs text-on-surface-variant mt-1">
                    Unlocked {fmt(e.startsAt)}
                  </div>
                </div>
                <span className="font-label text-xs uppercase tracking-widest text-primary">
                  Active
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-surface-container-low border border-outline-variant/15 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline text-xl text-primary">
            Purchase history
          </h2>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-sm text-on-surface-variant hover:text-primary font-label uppercase tracking-widest"
          >
            {showAll ? "Hide" : "Show all"}
          </button>
        </div>
        {showAll ? (
          history === undefined ? (
            <div className="h-24 bg-surface-container animate-pulse rounded-lg" />
          ) : history.length === 0 ? (
            <div className="text-on-surface-variant text-sm">
              No purchases yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-widest font-label text-on-surface-variant">
                <tr>
                  <th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Details</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Started</th>
                  <th className="text-left py-2">Expires</th>
                  <th className="text-left py-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {history.map((e) => (
                  <tr
                    key={e._id}
                    className="border-t border-outline-variant/10"
                  >
                    <td className="py-2 text-on-surface capitalize">
                      {e.kind}
                    </td>
                    <td className="py-2 text-on-surface-variant">
                      {e.kind === "subscription"
                        ? (e.planSlug ?? "")
                        : (e.jobTitle ?? "—")}
                    </td>
                    <td className="py-2 text-on-surface-variant capitalize">
                      {e.status}
                    </td>
                    <td className="py-2 text-on-surface-variant">
                      {fmt(e.startsAt)}
                    </td>
                    <td className="py-2 text-on-surface-variant">
                      {e.expiresAt ? fmt(e.expiresAt) : "—"}
                    </td>
                    <td className="py-2 text-on-surface-variant">
                      {e.source}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : null}
      </section>

      <Dialog
        open={confirmCancel}
        onOpenChange={(open) => {
          if (!open) setConfirmCancel(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel subscription?</DialogTitle>
            <DialogDescription>
              You'll keep access until your current period ends. After that
              you'll need to subscribe again to see locked job details.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmCancel(false)}
              disabled={busy}
            >
              Keep it
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await cancelSub({});
                  setConfirmCancel(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Canceling…" : "Cancel subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
