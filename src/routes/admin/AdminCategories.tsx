import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminCategories() {
  const categories = useQuery(api.categories.list, {});
  const subcategories = useQuery(api.subcategories.listAll, {});
  const catCreate = useMutation(api.categories.adminCreate);
  const catDelete = useMutation(api.categories.adminDelete);
  const subCreate = useMutation(api.subcategories.adminCreate);
  const subUpdate = useMutation(api.subcategories.adminUpdate);
  const subDelete = useMutation(api.subcategories.adminDelete);

  const [newCat, setNewCat] = useState({
    name: "",
    slug: "",
    icon: "category",
    description: "",
  });
  const [catErr, setCatErr] = useState<string | null>(null);
  const [pendingDelCat, setPendingDelCat] = useState<{
    id: Id<"categories">;
    name: string;
  } | null>(null);
  const [delErr, setDelErr] = useState<string | null>(null);

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatErr(null);
    try {
      await catCreate({
        slug: newCat.slug || slugify(newCat.name),
        name: newCat.name,
        icon: newCat.icon || "category",
        description: newCat.description,
      });
      setNewCat({ name: "", slug: "", icon: "category", description: "" });
    } catch (e: unknown) {
      setCatErr(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="px-10 py-10 max-w-5xl">
      <header className="flex items-center justify-between mb-10">
        <div>
          <h1 className="font-headline text-3xl font-bold text-primary tracking-tighter">
            Categories
          </h1>
          <p className="text-on-surface-variant text-sm">
            Top-level taxonomy. Sub-categories are tags scoped to a category —
            jobs can attach multiple.
          </p>
        </div>
      </header>

      <section className="bg-surface-container-low border border-outline-variant/15 rounded-xl p-6 mb-10">
        <h2 className="font-headline text-lg text-primary mb-4">
          New category
        </h2>
        <form onSubmit={addCategory} className="grid md:grid-cols-5 gap-4 items-end">
          <div className="space-y-2 md:col-span-1">
            <Label>Name</Label>
            <Input
              value={newCat.name}
              onChange={(e) => {
                const name = e.target.value;
                setNewCat((c) => ({
                  ...c,
                  name,
                  slug: c.slug || slugify(name),
                }));
              }}
              required
            />
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label>Slug</Label>
            <Input
              value={newCat.slug}
              onChange={(e) =>
                setNewCat({ ...newCat, slug: slugify(e.target.value) })
              }
              required
            />
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label>Icon</Label>
            <Input
              value={newCat.icon}
              onChange={(e) => setNewCat({ ...newCat, icon: e.target.value })}
              placeholder="Material symbol name"
            />
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label>Description</Label>
            <Input
              value={newCat.description}
              onChange={(e) =>
                setNewCat({ ...newCat, description: e.target.value })
              }
            />
          </div>
          <Button type="submit">
            <Icon name="add" /> Add
          </Button>
        </form>
        {catErr ? (
          <div className="mt-3 text-sm text-error">{catErr}</div>
        ) : null}
      </section>

      <div className="space-y-6">
        {categories === undefined || subcategories === undefined ? (
          <div className="bg-surface-container-low animate-pulse h-40 rounded-xl" />
        ) : categories.length === 0 ? (
          <div className="bg-surface-container-low border border-outline-variant/15 rounded-xl p-12 text-center">
            <Icon name="category" className="text-4xl text-outline mb-2" />
            <div className="text-on-surface-variant">No categories yet.</div>
          </div>
        ) : (
          categories.map((c) => {
            const subs = subcategories.filter(
              (s) => s.categoryId === c._id,
            );
            return (
              <CategoryPanel
                key={c._id}
                categoryId={c._id}
                categoryName={c.name}
                categoryIcon={c.icon}
                slug={c.slug}
                subs={subs}
                onDeleteCategory={() =>
                  setPendingDelCat({ id: c._id, name: c.name })
                }
                onCreateSub={async (name) => {
                  await subCreate({
                    categoryId: c._id,
                    name,
                    slug: slugify(name),
                  });
                }}
                onUpdateSub={async (id, name) => {
                  await subUpdate({
                    id,
                    categoryId: c._id,
                    name,
                    slug: slugify(name),
                  });
                }}
                onDeleteSub={async (id) => {
                  await subDelete({ id });
                }}
              />
            );
          })
        )}
      </div>

      <Dialog
        open={pendingDelCat !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelCat(null);
            setDelErr(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this category?</DialogTitle>
            <DialogDescription>
              Deleting{" "}
              <span className="text-primary">{pendingDelCat?.name}</span>{" "}
              fails if sub-categories or jobs still reference it. Clean those
              up first.
            </DialogDescription>
          </DialogHeader>
          {delErr ? (
            <div className="text-sm text-error bg-error-container/20 border border-error/30 rounded-md px-3 py-2">
              {delErr}
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPendingDelCat(null);
                setDelErr(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!pendingDelCat) return;
                try {
                  await catDelete({ id: pendingDelCat.id });
                  setPendingDelCat(null);
                  setDelErr(null);
                } catch (e: unknown) {
                  setDelErr(e instanceof Error ? e.message : String(e));
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

type Sub = {
  _id: Id<"subcategories">;
  name: string;
  slug: string;
};

function CategoryPanel({
  categoryId,
  categoryName,
  categoryIcon,
  slug,
  subs,
  onDeleteCategory,
  onCreateSub,
  onUpdateSub,
  onDeleteSub,
}: {
  categoryId: Id<"categories">;
  categoryName: string;
  categoryIcon: string;
  slug: string;
  subs: Sub[];
  onDeleteCategory: () => void;
  onCreateSub: (name: string) => Promise<void>;
  onUpdateSub: (id: Id<"subcategories">, name: string) => Promise<void>;
  onDeleteSub: (id: Id<"subcategories">) => Promise<void>;
}) {
  const [newSubName, setNewSubName] = useState("");
  const [editing, setEditing] = useState<{
    id: Id<"subcategories">;
    name: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  void categoryId;

  return (
    <section className="bg-surface-container-low border border-outline-variant/15 rounded-xl">
      <header className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
        <div className="flex items-center gap-3">
          <div className="bg-surface-container rounded-md p-2">
            <Icon name={categoryIcon} className="text-primary text-base" />
          </div>
          <div>
            <div className="font-headline text-primary">{categoryName}</div>
            <div className="text-xs text-on-surface-variant font-mono">
              {slug}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDeleteCategory}
          className="text-error hover:text-error"
        >
          <Icon name="delete" className="text-base" /> Delete
        </Button>
      </header>

      <div className="p-6">
        <div className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-3">
          Sub-categories
        </div>
        {subs.length === 0 ? (
          <div className="text-sm text-on-surface-variant italic mb-4">
            No sub-categories yet.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 mb-4">
            {subs.map((s) => (
              <div
                key={s._id}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
                  "border-outline text-on-surface",
                )}
              >
                {editing?.id === s._id ? (
                  <>
                    <Input
                      className="h-7 text-xs w-40"
                      value={editing.name}
                      onChange={(e) =>
                        setEditing({ ...editing, name: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await onUpdateSub(editing.id, editing.name);
                          setEditing(null);
                        } finally {
                          setBusy(false);
                        }
                      }}
                      className="text-primary hover:opacity-80"
                    >
                      <Icon name="check" className="text-base" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="text-outline hover:text-on-surface"
                    >
                      <Icon name="close" className="text-base" />
                    </button>
                  </>
                ) : (
                  <>
                    <span>{s.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({ id: s._id, name: s.name })
                      }
                      className="text-outline hover:text-primary"
                      aria-label="Edit"
                    >
                      <Icon name="edit" className="text-sm" />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await onDeleteSub(s._id);
                        } finally {
                          setBusy(false);
                        }
                      }}
                      className="text-outline hover:text-error"
                      aria-label="Delete"
                    >
                      <Icon name="close" className="text-sm" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newSubName.trim()) return;
            setBusy(true);
            try {
              await onCreateSub(newSubName.trim());
              setNewSubName("");
            } finally {
              setBusy(false);
            }
          }}
          className="flex gap-2"
        >
          <Input
            value={newSubName}
            onChange={(e) => setNewSubName(e.target.value)}
            placeholder="New sub-category name"
            className="max-w-xs"
          />
          <Button type="submit" size="sm" disabled={busy || !newSubName.trim()}>
            <Icon name="add" /> Add
          </Button>
        </form>
      </div>
    </section>
  );
}
