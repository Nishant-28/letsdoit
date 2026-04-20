import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@/components/Icon";

type FormState = {
  slug: string;
  name: string;
  logoUrl: string;
  websiteUrl: string;
  hqLocation: string;
  description: string;
};

const EMPTY: FormState = {
  slug: "",
  name: "",
  logoUrl: "",
  websiteUrl: "",
  hqLocation: "",
  description: "",
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminCompanyForm() {
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const existing = useQuery(
    api.companies.getById,
    isEditing && id ? { id: id as Id<"companies"> } : "skip",
  );
  const createCompany = useMutation(api.companies.adminCreate);
  const updateCompany = useMutation(api.companies.adminUpdate);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && existing) {
      setForm({
        slug: existing.slug,
        name: existing.name,
        logoUrl: existing.logoUrl,
        websiteUrl: existing.websiteUrl ?? "",
        hqLocation: existing.hqLocation ?? "",
        description: existing.description ?? "",
      });
    }
  }, [isEditing, existing]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    const payload = {
      slug: form.slug.trim() || slugify(form.name),
      name: form.name.trim(),
      logoUrl: form.logoUrl.trim(),
      websiteUrl: form.websiteUrl.trim() || undefined,
      hqLocation: form.hqLocation.trim() || undefined,
      description: form.description.trim() || undefined,
    };
    try {
      if (isEditing && id) {
        await updateCompany({ id: id as Id<"companies">, ...payload });
      } else {
        await createCompany(payload);
      }
      navigate("/admin/companies");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (isEditing && existing === undefined) {
    return (
      <div className="px-10 py-10">
        <div className="h-64 bg-surface-container-low animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="px-10 py-10 max-w-2xl">
      <Link
        to="/admin/companies"
        className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary mb-6 font-label text-sm"
      >
        <Icon name="arrow_back" className="text-base" /> Back to companies
      </Link>
      <h1 className="font-headline text-3xl font-bold text-primary mb-8 tracking-tighter">
        {isEditing ? "Edit Company" : "New Company"}
      </h1>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <Field label="Name">
            <Input
              value={form.name}
              onChange={(e) => {
                const next = e.target.value;
                setForm((f) => ({
                  ...f,
                  name: next,
                  slug: isEditing ? f.slug : slugify(next),
                }));
              }}
              required
            />
          </Field>
          <Field label="Slug" help="URL-friendly identifier, lowercase.">
            <Input
              value={form.slug}
              onChange={(e) =>
                setForm({ ...form, slug: slugify(e.target.value) })
              }
              required
            />
          </Field>
        </div>

        <Field label="Logo URL">
          <Input
            value={form.logoUrl}
            onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
            placeholder="https://…"
            required
          />
        </Field>

        <div className="grid md:grid-cols-2 gap-6">
          <Field label="Website">
            <Input
              type="url"
              value={form.websiteUrl}
              onChange={(e) =>
                setForm({ ...form, websiteUrl: e.target.value })
              }
              placeholder="https://company.com"
            />
          </Field>
          <Field label="HQ location">
            <Input
              value={form.hqLocation}
              onChange={(e) =>
                setForm({ ...form, hqLocation: e.target.value })
              }
              placeholder="San Francisco, CA"
            />
          </Field>
        </div>

        <Field label="Description">
          <Textarea
            rows={6}
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />
        </Field>

        {err ? (
          <div className="text-sm text-error bg-error-container/20 border border-error/30 rounded-md px-3 py-2">
            {err}
          </div>
        ) : null}

        <div className="flex justify-end gap-3 pt-4">
          <Button asChild variant="ghost" type="button">
            <Link to="/admin/companies">Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving
              ? "Saving…"
              : isEditing
                ? "Save Changes"
                : "Create Company"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {help ? (
        <div className="text-xs text-outline font-label">{help}</div>
      ) : null}
    </div>
  );
}
