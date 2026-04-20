import { useQuery } from "convex/react";
import { Link } from "react-router";
import { api } from "../../../convex/_generated/api";
import { Icon } from "@/components/Icon";

export function AdminDashboard() {
  const stats = useQuery(api.admin.adminStats, {});

  return (
    <div className="px-10 py-10">
      <header className="mb-10">
        <h1 className="font-headline text-3xl font-bold text-primary tracking-tighter">
          Overview
        </h1>
        <p className="text-on-surface-variant text-sm">
          Snapshot of content and revenue signals.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard
          icon="work"
          label="Jobs published"
          value={stats?.jobs.published}
          hint={`${stats?.jobs.draft ?? 0} draft · ${stats?.jobs.archived ?? 0} archived`}
        />
        <StatCard
          icon="verified"
          label="Active subscriptions"
          value={stats?.subscriptions.active}
          hint={`${stats?.subscriptions.canceled ?? 0} canceled`}
        />
        <StatCard
          icon="lock_open"
          label="Role unlocks"
          value={stats?.roleUnlocks}
        />
        <StatCard
          icon="people"
          label="Users"
          value={stats?.users}
          hint={`${stats?.companies ?? 0} companies · ${stats?.categories ?? 0} cats`}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Link
          to="/admin/jobs"
          className="bg-surface-container-low border border-outline-variant/15 rounded-xl p-6 hover:bg-surface-container transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <Icon name="work" className="text-primary" />
            <span className="font-headline text-primary">Manage jobs</span>
          </div>
          <p className="text-sm text-on-surface-variant">
            Create, edit, archive job listings. Track views / unlocks / applies
            per role.
          </p>
        </Link>
        <Link
          to="/admin/companies"
          className="bg-surface-container-low border border-outline-variant/15 rounded-xl p-6 hover:bg-surface-container transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <Icon name="domain" className="text-primary" />
            <span className="font-headline text-primary">
              Manage companies
            </span>
          </div>
          <p className="text-sm text-on-surface-variant">
            Admin-managed directory of employers jobs can reference.
          </p>
        </Link>
        <Link
          to="/admin/categories"
          className="bg-surface-container-low border border-outline-variant/15 rounded-xl p-6 hover:bg-surface-container transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <Icon name="category" className="text-primary" />
            <span className="font-headline text-primary">
              Manage categories
            </span>
          </div>
          <p className="text-sm text-on-surface-variant">
            Top-level taxonomy and their sub-category tags.
          </p>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: string;
  label: string;
  value: number | undefined;
  hint?: string;
}) {
  return (
    <div className="bg-surface-container-low border border-outline-variant/15 rounded-xl p-5">
      <div className="flex items-center gap-2 text-on-surface-variant text-xs font-label uppercase tracking-widest mb-3">
        <Icon name={icon} className="text-sm" />
        {label}
      </div>
      <div className="font-headline text-3xl font-bold text-primary tracking-tight">
        {value === undefined ? "—" : value}
      </div>
      {hint ? (
        <div className="text-xs text-on-surface-variant mt-1">{hint}</div>
      ) : null}
    </div>
  );
}
