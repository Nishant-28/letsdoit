import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/app/PageHeader";
import { FullPageLoader } from "@/components/auth/FullPageLoader";
import { cn } from "@/lib/utils";

export function AdminUsers() {
  const users = useQuery(api.admin.listUsers, {});
  const [search, setSearch] = useState("");

  if (users === undefined) {
    return <FullPageLoader label="Loading users..." />;
  }

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-10 space-y-8">
      <PageHeader
        eyebrow="System"
        title="Users"
        description="View all registered users and their roles."
      />

      <div className="flex flex-col gap-4 bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-6">
        <div className="relative w-full md:w-96">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant"
          />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant/20 rounded-lg pl-10 pr-4 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant text-sm">
            No users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-outline-variant/20 text-outline-variant uppercase tracking-wider text-[10px] font-label">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Intent</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map((u) => (
                  <tr key={u._id} className="hover:bg-surface-container-low/50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-primary">{u.name}</div>
                      <div className="text-xs text-on-surface-variant">
                        {u.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "font-label text-[10px] uppercase tracking-widest px-2 py-1 rounded-full border",
                          u.role === "admin"
                            ? "bg-primary/10 border-primary/30 text-primary"
                            : "bg-surface-container border-outline-variant/20 text-on-surface-variant",
                        )}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant capitalize">
                      {u.intent || "—"}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
