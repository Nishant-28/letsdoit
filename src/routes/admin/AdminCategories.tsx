import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/app/PageHeader";
import { FullPageLoader } from "@/components/auth/FullPageLoader";

export function AdminCategories() {
  const categories = useQuery(api.categories.list, {});
  const subcategories = useQuery(api.subcategories.listAll, {});
  
  if (categories === undefined || subcategories === undefined) {
    return <FullPageLoader label="Loading categories..." />;
  }

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-10 space-y-8">
      <PageHeader
        eyebrow="Inventory"
        title="Categories"
        description="Manage the main categories and their sub-categories."
        actions={
          <button
            className="inline-flex items-center gap-2 bg-primary text-on-primary font-headline font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-container transition-colors opacity-50 cursor-not-allowed"
            title="Category creation via UI is coming soon. Use seeding for now."
            disabled
          >
            <Icon name="add" className="text-base" />
            Add Category
          </button>
        }
      />

      <div className="space-y-6">
        {categories.length === 0 ? (
          <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-12 text-center text-on-surface-variant text-sm">
            No categories exist.
          </div>
        ) : (
          categories.map((c) => {
            const subs = subcategories.filter((s) => s.categoryId === c._id);
            return (
              <div
                key={c._id}
                className="bg-surface-container-lowest border border-outline-variant/15 rounded-xl overflow-hidden"
              >
                <div className="p-4 sm:p-6 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-low/30">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-surface-container rounded-lg flex items-center justify-center text-primary">
                      <Icon name={c.icon} className="text-2xl" />
                    </div>
                    <div>
                      <h3 className="font-headline font-semibold text-primary text-lg">
                        {c.name}
                      </h3>
                      <p className="font-body text-sm text-on-surface-variant">
                        {c.description} • {subs.length} subcategories
                      </p>
                    </div>
                  </div>
                  <div className="font-label text-xs uppercase tracking-widest text-outline-variant">
                    {c.slug}
                  </div>
                </div>
                
                <div className="p-4 sm:p-6">
                  {subs.length === 0 ? (
                    <div className="text-sm text-on-surface-variant italic">
                      No subcategories yet.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {subs.map((s) => (
                        <div
                          key={s._id}
                          className="bg-surface-container-low border border-outline-variant/20 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm"
                        >
                          <span className="font-medium text-on-surface">
                            {s.name}
                          </span>
                          <span className="text-xs text-outline-variant">
                            {s.slug}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
