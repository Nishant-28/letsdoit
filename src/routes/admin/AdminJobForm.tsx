import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/app/PageHeader";
import { FullPageLoader } from "@/components/auth/FullPageLoader";
import { cn } from "@/lib/utils";

type Level = "intern" | "entry" | "junior" | "mid" | "senior" | "staff" | "principal";
type WorkMode = "remote" | "hybrid" | "onsite";
type Status = "draft" | "published" | "archived";

const LEVELS: { value: Level; label: string }[] = [
  { value: "intern", label: "Intern" },
  { value: "entry", label: "Entry Level" },
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid-Level" },
  { value: "senior", label: "Senior" },
  { value: "staff", label: "Staff" },
  { value: "principal", label: "Principal" },
];

const WORK_MODES: { value: WorkMode; label: string; icon: string }[] = [
  { value: "remote", label: "Remote", icon: "wifi" },
  { value: "hybrid", label: "Hybrid", icon: "apartment" },
  { value: "onsite", label: "Onsite", icon: "location_on" },
];

export function AdminJobForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const existing = useQuery(
    api.jobs.adminGet,
    isEdit ? { id: id as Id<"jobs"> } : "skip",
  );
  const companies = useQuery(api.companies.list, {});
  const categories = useQuery(api.categories.list, {});
  const subcategories = useQuery(api.subcategories.listAll, {});

  const createJob = useMutation(api.jobs.adminCreate);
  const updateJob = useMutation(api.jobs.adminUpdate);

  // Form state
  const [title, setTitle] = useState("");
  const [companyId, setCompanyId] = useState<string>("");
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState<WorkMode>("onsite");
  const [level, setLevel] = useState<Level>("entry");
  const [categoryId, setCategoryId] = useState<string>("");
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<string[]>([]);
  const [skillsInput, setSkillsInput] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [unlockPrice, setUnlockPrice] = useState("9");
  const [applyUrl, setApplyUrl] = useState("");
  const [descriptionMd, setDescriptionMd] = useState("");
  const [status, setStatus] = useState<Status>("draft");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill form when editing
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (isEdit && existing && !prefilled) {
      setTitle(existing.title);
      setCompanyId(existing.companyId);
      setLocation(existing.location);
      setWorkMode(existing.workMode);
      setLevel(existing.level);
      setCategoryId(existing.categoryId);
      setSelectedSubcategoryIds(existing.subcategoryIds);
      setSkillsInput(existing.skills.join(", "));
      setTagsInput(existing.tags.join(", "));
      setUnlockPrice(String(existing.unlockPricePaise / 100));
      setApplyUrl(existing.applyUrl);
      setDescriptionMd(existing.descriptionMd);
      setStatus(existing.status);
      if (existing.salaryMinPaise) setSalaryMin(String(existing.salaryMinPaise / 100));
      if (existing.salaryMaxPaise) setSalaryMax(String(existing.salaryMaxPaise / 100));
      setPrefilled(true);
    }
  }, [isEdit, existing, prefilled]);

  const filteredSubs = subcategories?.filter(
    (s) => s.categoryId === categoryId,
  ) ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) return setError("Title is required.");
    if (!companyId) return setError("Select a company.");
    if (!location.trim()) return setError("Location is required.");
    if (!categoryId) return setError("Select a category.");
    if (!applyUrl.trim()) return setError("Apply URL is required.");
    if (!descriptionMd.trim()) return setError("Description is required.");

    const skills = skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (skills.length === 0) return setError("At least one skill is required.");

    const payload = {
      title: title.trim(),
      companyId: companyId as Id<"companies">,
      location: location.trim(),
      workMode,
      level,
      categoryId: categoryId as Id<"categories">,
      subcategoryIds: selectedSubcategoryIds as Id<"subcategories">[],
      skills,
      tags,
      unlockPricePaise: Math.round(parseFloat(unlockPrice || "9") * 100),
      applyUrl: applyUrl.trim(),
      descriptionMd: descriptionMd.trim(),
      status,
      ...(salaryMin ? { salaryMinPaise: Math.round(parseFloat(salaryMin) * 100) } : {}),
      ...(salaryMax ? { salaryMaxPaise: Math.round(parseFloat(salaryMax) * 100) } : {}),
    };

    setSaving(true);
    try {
      if (isEdit) {
        await updateJob({ id: id as Id<"jobs">, ...payload });
      } else {
        await createJob(payload);
      }
      navigate("/admin/jobs");
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  // Loading states
  if (isEdit && existing === undefined) {
    return <FullPageLoader label="Loading job" />;
  }
  if (isEdit && existing === null) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <Icon name="error" className="text-4xl text-outline mb-3" />
        <div className="font-headline text-lg text-primary mb-2">
          Job not found
        </div>
        <Link
          to="/admin/jobs"
          className="inline-flex items-center gap-2 text-primary font-label text-sm"
        >
          <Icon name="arrow_back" /> Back to jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-screen-lg mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-10 md:py-14">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <Link
              to="/admin"
              className="hover:text-primary transition-colors"
            >
              Admin
            </Link>
            <span className="text-outline-variant/40">/</span>
            <Link
              to="/admin/jobs"
              className="hover:text-primary transition-colors"
            >
              Jobs
            </Link>
            <span className="text-outline-variant/40">/</span>
            {isEdit ? "Edit" : "Create"}
          </span>
        }
        title={isEdit ? "Edit Job" : "Create Job"}
      />

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {error && (
          <div className="bg-red-400/10 border border-red-400/30 text-red-300 font-body text-sm px-4 py-3 rounded-lg flex items-center gap-2">
            <Icon name="error" className="text-base" />
            {error}
          </div>
        )}

        {/* Title */}
        <FormGroup label="Job Title" required>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Frontend Developer"
            className="form-input"
          />
        </FormGroup>

        {/* Company + Category row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <FormGroup label="Company" required>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="form-input"
            >
              <option value="">Select company</option>
              {(companies ?? []).map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormGroup>

          <FormGroup label="Category" required>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setSelectedSubcategoryIds([]);
              }}
              className="form-input"
            >
              <option value="">Select category</option>
              {(categories ?? []).map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormGroup>
        </div>

        {/* Subcategories */}
        {filteredSubs.length > 0 && (
          <FormGroup label="Subcategories">
            <div className="flex flex-wrap gap-2">
              {filteredSubs.map((s) => {
                const selected = selectedSubcategoryIds.includes(s._id);
                return (
                  <button
                    key={s._id}
                    type="button"
                    onClick={() =>
                      setSelectedSubcategoryIds((prev) =>
                        selected
                          ? prev.filter((id) => id !== s._id)
                          : [...prev, s._id],
                      )
                    }
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-label border transition-colors",
                      selected
                        ? "bg-primary text-on-primary border-primary"
                        : "border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high",
                    )}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </FormGroup>
        )}

        {/* Location + Work Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <FormGroup label="Location" required>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Bangalore, India"
              className="form-input"
            />
          </FormGroup>

          <FormGroup label="Work Mode" required>
            <div className="flex gap-2">
              {WORK_MODES.map((wm) => (
                <button
                  key={wm.value}
                  type="button"
                  onClick={() => setWorkMode(wm.value)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-label transition-colors",
                    workMode === wm.value
                      ? "bg-primary text-on-primary border-primary"
                      : "border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high",
                  )}
                >
                  <Icon name={wm.icon} className="text-sm" />
                  {wm.label}
                </button>
              ))}
            </div>
          </FormGroup>
        </div>

        {/* Level + Unlock Price */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <FormGroup label="Experience Level" required>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as Level)}
              className="form-input"
            >
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </FormGroup>

          <FormGroup label="Unlock Price (₹)" required>
            <input
              type="number"
              value={unlockPrice}
              onChange={(e) => setUnlockPrice(e.target.value)}
              placeholder="9"
              min="0"
              step="1"
              className="form-input"
            />
          </FormGroup>
        </div>

        {/* Skills + Tags */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <FormGroup label="Skills" required hint="Comma-separated">
            <input
              type="text"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="React, TypeScript, Node.js"
              className="form-input"
            />
            {skillsInput && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {skillsInput
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((s) => (
                    <span
                      key={s}
                      className="bg-surface-container-high text-on-surface font-label text-[10px] px-2 py-0.5 rounded-md border border-outline-variant/30"
                    >
                      {s}
                    </span>
                  ))}
              </div>
            )}
          </FormGroup>

          <FormGroup label="Tags" hint="Comma-separated (optional)">
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="new, urgent, featured"
              className="form-input"
            />
          </FormGroup>
        </div>

        {/* Salary (optional) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <FormGroup label="Salary Min (₹, optional)">
            <input
              type="number"
              value={salaryMin}
              onChange={(e) => setSalaryMin(e.target.value)}
              placeholder="e.g. 25000"
              min="0"
              className="form-input"
            />
          </FormGroup>
          <FormGroup label="Salary Max (₹, optional)">
            <input
              type="number"
              value={salaryMax}
              onChange={(e) => setSalaryMax(e.target.value)}
              placeholder="e.g. 50000"
              min="0"
              className="form-input"
            />
          </FormGroup>
        </div>

        {/* Apply URL */}
        <FormGroup label="Apply URL" required>
          <input
            type="url"
            value={applyUrl}
            onChange={(e) => setApplyUrl(e.target.value)}
            placeholder="https://company.com/careers/apply"
            className="form-input"
          />
        </FormGroup>

        {/* Description */}
        <FormGroup label="Job Description" required hint="Markdown supported">
          <textarea
            value={descriptionMd}
            onChange={(e) => setDescriptionMd(e.target.value)}
            placeholder="Describe the role, responsibilities, qualifications..."
            rows={8}
            className="form-input resize-y min-h-[120px]"
          />
        </FormGroup>

        {/* Status */}
        <FormGroup label="Status" required>
          <div className="flex gap-3">
            {(["draft", "published"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  "flex-1 sm:flex-none px-5 py-2.5 rounded-lg border font-label text-sm transition-colors",
                  status === s
                    ? s === "published"
                      ? "bg-primary text-on-primary border-primary"
                      : "bg-surface-container-high text-primary border-primary/30"
                    : "border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high",
                )}
              >
                {s === "draft" ? "Save as Draft" : "Publish"}
              </button>
            ))}
          </div>
        </FormGroup>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-outline-variant/15">
          <Link
            to="/admin/jobs"
            className="w-full sm:w-auto text-center border border-outline-variant/30 text-on-surface font-headline px-6 py-3 rounded-lg hover:bg-surface-container-low transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className={cn(
              "w-full sm:w-auto bg-primary text-on-primary font-headline font-semibold px-8 py-3 rounded-lg hover:bg-primary-container transition-colors inline-flex items-center justify-center gap-2",
              saving && "opacity-60 cursor-not-allowed",
            )}
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Icon name={isEdit ? "save" : "add"} />
                {isEdit ? "Update Job" : "Create Job"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function FormGroup({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block font-label text-xs uppercase tracking-[0.2em] text-on-surface-variant mb-2">
        {label}
        {required && <span className="text-primary ml-1">*</span>}
        {hint && (
          <span className="normal-case tracking-normal text-outline-variant ml-2 font-body">
            ({hint})
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
