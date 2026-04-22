import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/app/PageHeader";
import { FullPageLoader } from "@/components/auth/FullPageLoader";

export function AdminCompanies() {
  const companies = useQuery(api.companies.list, {});
  const deleteCompany = useMutation(api.companies.adminDelete);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<Id<"companies"> | null>(null);

  if (companies === undefined) {
    return <FullPageLoader label="Loading companies..." />;
  }

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase()),
  );

  const handleDelete = async (id: Id<"companies">) => {
    if (!confirm("Are you sure you want to delete this company?")) return;
    try {
      setDeletingId(id);
      await deleteCompany({ id });
    } catch (err: any) {
      alert(err.message || "Failed to delete company.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-10 space-y-8">
      <PageHeader
        eyebrow="Inventory"
        title="Companies"
        description="Manage company profiles, logos, and details."
        actions={
          <Link
            to="/admin/companies/new"
            className="inline-flex items-center gap-2 bg-primary text-on-primary font-headline font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-container transition-colors"
          >
            <Icon name="add" className="text-base" />
            Add Company
          </Link>
        }
      />

      <div className="flex flex-col gap-4 bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-6">
        <div className="relative w-full md:w-96">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant"
          />
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant/20 rounded-lg pl-10 pr-4 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant text-sm">
            No companies found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-outline-variant/20 text-outline-variant uppercase tracking-wider text-[10px] font-label">
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map((c) => (
                  <tr key={c._id} className="hover:bg-surface-container-low/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={c.logoUrl}
                          alt={c.name}
                          className="w-8 h-8 rounded-md object-cover border border-outline-variant/20"
                        />
                        <div className="font-semibold text-primary">
                          {c.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {c.slug}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {c.hqLocation || "—"}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {c.websiteUrl ? (
                        <a
                          href={c.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-outline-variant hover:text-primary transition-colors p-1 inline-flex"
                          title="Visit Website"
                        >
                          <Icon name="open_in_new" className="text-lg" />
                        </a>
                      ) : null}
                      <Link
                        to={`/admin/companies/${c._id}/edit`}
                        className="text-outline-variant hover:text-primary transition-colors p-1 inline-flex"
                        title="Edit Company"
                      >
                        <Icon name="edit" className="text-lg" />
                      </Link>
                      <button
                        onClick={() => handleDelete(c._id)}
                        disabled={deletingId === c._id}
                        className="text-error/70 hover:text-error transition-colors p-1 inline-flex disabled:opacity-50"
                        title="Delete Company"
                      >
                        <Icon name="delete" className="text-lg" />
                      </button>
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
