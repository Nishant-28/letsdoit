import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

const LEVELS = [
  "intern",
  "entry",
  "junior",
  "mid",
  "senior",
  "staff",
  "principal",
] as const;
const WORK_MODES = ["remote", "hybrid", "onsite"] as const;
const STATUSES = ["draft", "published", "archived"] as const;

type Level = (typeof LEVELS)[number];
type WorkMode = (typeof WORK_MODES)[number];
type Status = (typeof STATUSES)[number];

type FormState = {
  title: string;
  companyId: string;
  location: string;
  workMode: WorkMode;
  level: Level;
  categoryId: string;
  subcategoryIds: string[];
  skills: string;
  tags: string;
  unlockPricePaise: number;
  applyUrl: string;
  descriptionMd: string;
  status: Status;
};

const EMPTY: FormState = {
  title: "",
  companyId: "",
  location: "",
  workMode: "remote",
  level: "entry",
  categoryId: "",
  subcategoryIds: [],
  skills: "",
  tags: "",
  unlockPricePaise: 900,
  applyUrl: "",
  descriptionMd: "",
  status: "draft",
};

export function AdminJobForm() {
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const categories = useQuery(api.categories.list, {});
  const companies = useQuery(api.companies.list, {});
  const subcategories = useQuery(api.subcategories.listAll, {});
  const existing = useQuery(
    api.jobs.adminGet,
    isEditing && id ? { id: id as Id<"jobs"> } : "skip",
  );
  const createJob = useMutation(api.jobs.adminCreate);
  const updateJob = useMutation(api.jobs.adminUpdate);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditing && existing) {
      setForm({
        title: existing.title,
        companyId: existing.companyId,
        location: existing.location,
        workMode: existing.workMode,
        level: existing.level,
        categoryId: existing.categoryId,
        subcategoryIds: existing.subcategoryIds as unknown as string[],
        skills: existing.skills.join(", "),
        tags: existing.tags.join(", "),
        unlockPricePaise: existing.unlockPricePaise,
        applyUrl: existing.applyUrl,
        descriptionMd: existing.descriptionMd,
        status: existing.status,
      });
    }
  }, [isEditing, existing]);

  useEffect(() => {
    if (!isEditing && !form.categoryId && categories && categories.length) {
      setForm((f) => ({ ...f, categoryId: categories[0]!._id }));
    }
  }, [categories, isEditing, form.categoryId]);

  useEffect(() => {
    if (!isEditing && !form.companyId && companies && companies.length) {
      setForm((f) => ({ ...f, companyId: companies[0]!._id }));
    }
  }, [companies, isEditing, form.companyId]);

  const filteredSubs = useMemo(() => {
    if (!subcategories || !form.categoryId) return [];
    return subcategories.filter((s) => s.categoryId === form.categoryId);
  }, [subcategories, form.categoryId]);

  // Drop any previously-chosen subcategories that don't belong to the
  // current category (admin switched category after selecting chips).
  useEffect(() => {
    if (!subcategories) return;
    const allowed = new Set(
      subcategories
        .filter((s) => s.categoryId === form.categoryId)
        .map((s) => s._id as unknown as string),
    );
    setForm((f) => {
      const keep = f.subcategoryIds.filter((id) => allowed.has(id));
      if (keep.length === f.subcategoryIds.length) return f;
      return { ...f, subcategoryIds: keep };
    });
  }, [form.categoryId, subcategories]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.categoryId) {
      alert("Pick a category");
      return;
    }
    if (!form.companyId) {
      alert("Pick a company");
      return;
    }
    const payload = {
      title: form.title.trim(),
      companyId: form.companyId as Id<"companies">,
      location: form.location.trim(),
      workMode: form.workMode,
      level: form.level,
      categoryId: form.categoryId as Id<"categories">,
      subcategoryIds: form.subcategoryIds as unknown as Id<"subcategories">[],
      skills: form.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      tags: form.tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      unlockPricePaise: Number(form.unlockPricePaise) || 0,
      applyUrl: form.applyUrl.trim(),
      descriptionMd: form.descriptionMd,
      status: form.status,
    };
    setSaving(true);
    try {
      if (isEditing && id) {
        await updateJob({ id: id as Id<"jobs">, ...payload });
      } else {
        await createJob(payload);
      }
      navigate("/admin/jobs");
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

  const toggleSub = (id: string) =>
    setForm((f) => ({
      ...f,
      subcategoryIds: f.subcategoryIds.includes(id)
        ? f.subcategoryIds.filter((x) => x !== id)
        : [...f.subcategoryIds, id],
    }));

  return (
    <div className="px-10 py-10 max-w-4xl">
      <Link
        to="/admin/jobs"
        className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary mb-6 font-label text-sm"
      >
        <Icon name="arrow_back" className="text-base" /> Back to jobs
      </Link>
      <h1 className="font-headline text-3xl font-bold text-primary mb-8 tracking-tighter">
        {isEditing ? "Edit Job" : "New Job"}
      </h1>

      <form onSubmit={onSubmit} className="space-y-6">
        <Field label="Title">
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </Field>

        <div className="grid md:grid-cols-2 gap-6">
          <Field
            label="Company"
            help={
              (companies ?? []).length === 0
                ? "No companies yet — add one in Companies."
                : undefined
            }
          >
            <Select
              value={form.companyId}
              onValueChange={(v) => setForm({ ...form, companyId: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pick a company" />
              </SelectTrigger>
              <SelectContent>
                {(companies ?? []).map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link
              to="/admin/companies/new"
              className="text-xs text-primary font-label hover:underline"
            >
              + New company
            </Link>
          </Field>
          <Field label="Location">
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              required
            />
          </Field>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Field label="Work mode">
            <Select
              value={form.workMode}
              onValueChange={(v) =>
                setForm({ ...form, workMode: v as WorkMode })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORK_MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Level">
            <Select
              value={form.level}
              onValueChange={(v) => setForm({ ...form, level: v as Level })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onValueChange={(v) =>
                setForm({ ...form, status: v as Status })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Category">
          <Select
            value={form.categoryId}
            onValueChange={(v) => setForm({ ...form, categoryId: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pick a category" />
            </SelectTrigger>
            <SelectContent>
              {(categories ?? []).map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {filteredSubs.length > 0 ? (
          <Field
            label="Sub-categories (tags)"
            help="Curated taxonomy — multi-select."
          >
            <div className="flex flex-wrap gap-2">
              {filteredSubs.map((s) => {
                const checked = form.subcategoryIds.includes(
                  s._id as unknown as string,
                );
                return (
                  <button
                    key={s._id}
                    type="button"
                    onClick={() => toggleSub(s._id as unknown as string)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-label border transition-colors",
                      checked
                        ? "bg-primary text-on-primary border-primary"
                        : "border-outline text-on-surface-variant hover:bg-surface-container",
                    )}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </Field>
        ) : null}

        <div className="grid md:grid-cols-2 gap-6">
          <Field label="Skills (comma separated)">
            <Input
              value={form.skills}
              onChange={(e) => setForm({ ...form, skills: e.target.value })}
              placeholder="C++, Avionics"
            />
          </Field>
          <Field label="Tags (free-form, comma separated)">
            <Input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="featured, new"
            />
          </Field>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Field
            label="Unlock price (USD cents / paise)"
            help="Default 900 = $9"
          >
            <Input
              type="number"
              min={0}
              step={100}
              value={form.unlockPricePaise}
              onChange={(e) =>
                setForm({
                  ...form,
                  unlockPricePaise: Number(e.target.value) || 0,
                })
              }
            />
          </Field>
          <Field label="Apply URL">
            <Input
              type="url"
              value={form.applyUrl}
              onChange={(e) => setForm({ ...form, applyUrl: e.target.value })}
              placeholder="https://company.com/careers/role"
              required
            />
          </Field>
        </div>

        <Field label="Description (markdown)">
          <Textarea
            rows={10}
            value={form.descriptionMd}
            onChange={(e) =>
              setForm({ ...form, descriptionMd: e.target.value })
            }
          />
        </Field>

        <div className="flex justify-end gap-3 pt-4">
          <Button asChild variant="ghost" type="button">
            <Link to="/admin/jobs">Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : isEditing ? "Save Changes" : "Create Job"}
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
