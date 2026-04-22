import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/app/PageHeader";

export function AdminCompanyForm() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const company = useQuery(
    api.companies.getById,
    isEditing ? { id: id as Id<"companies"> } : "skip",
  );

  const createCompany = useMutation(api.companies.adminCreate);
  const updateCompany = useMutation(api.companies.adminUpdate);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [hqLocation, setHqLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company && isEditing) {
      setName(company.name);
      setSlug(company.slug);
      setLogoUrl(company.logoUrl);
      setWebsiteUrl(company.websiteUrl ?? "");
      setDescription(company.description ?? "");
      setHqLocation(company.hqLocation ?? "");
    }
  }, [company, isEditing]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!isEditing) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, ""),
      );
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name,
        slug,
        logoUrl,
        websiteUrl: websiteUrl || undefined,
        description: description || undefined,
        hqLocation: hqLocation || undefined,
      };

      if (isEditing) {
        await updateCompany({ id: id as Id<"companies">, ...payload });
      } else {
        await createCompany(payload);
      }
      navigate("/admin/companies");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setSaving(false);
    }
  };

  if (isEditing && company === undefined) {
    return <div className="p-8 text-center text-outline-variant">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <Link
        to="/admin/companies"
        className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary mb-2 font-label text-sm"
      >
        <Icon name="arrow_back" className="text-base" /> Back to Companies
      </Link>
      
      <PageHeader
        eyebrow="Inventory"
        title={isEditing ? "Edit Company" : "New Company"}
      />

      <form onSubmit={onSubmit} className="bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-6 space-y-6">
        {error && (
          <div className="bg-error/10 text-error px-4 py-3 rounded-lg border border-error/20 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="font-label text-xs uppercase tracking-widest text-outline-variant">
              Company Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={handleNameChange}
              className="w-full bg-surface-container border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="space-y-1">
            <label className="font-label text-xs uppercase tracking-widest text-outline-variant">
              Slug (Unique ID)
            </label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="font-label text-xs uppercase tracking-widest text-outline-variant">
            Logo URL
          </label>
          <div className="flex gap-4 items-center">
            <input
              type="url"
              required
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="flex-1 bg-surface-container border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Logo preview"
                className="w-10 h-10 rounded-md object-cover border border-outline-variant/20 bg-surface"
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="font-label text-xs uppercase tracking-widest text-outline-variant">
              Website URL (Optional)
            </label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="space-y-1">
            <label className="font-label text-xs uppercase tracking-widest text-outline-variant">
              HQ Location (Optional)
            </label>
            <input
              type="text"
              value={hqLocation}
              onChange={(e) => setHqLocation(e.target.value)}
              placeholder="e.g. San Francisco, CA"
              className="w-full bg-surface-container border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="font-label text-xs uppercase tracking-widest text-outline-variant">
            Description (Optional)
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="pt-4 border-t border-outline-variant/10 flex justify-end gap-3">
          <Link
            to="/admin/companies"
            className="px-5 py-2.5 rounded-lg border border-outline-variant/30 font-headline font-semibold text-on-surface hover:bg-surface-container transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-primary text-on-primary font-headline font-semibold hover:bg-primary-container transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Company"}
          </button>
        </div>
      </form>
    </div>
  );
}
