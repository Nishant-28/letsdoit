import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link, useNavigate } from "react-router";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@/lib/auth";
import { JobCard } from "@/components/JobCard";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export function Explore() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [activeCat, setActiveCat] = useState<string | undefined>(undefined);
  const [activeSub, setActiveSub] = useState<string | undefined>(undefined);
  const search = useDebounced(searchInput, 200);

  const categories = useQuery(api.categories.list, {});
  const subcategories = useQuery(api.subcategories.listAll, {});
  const jobs = useQuery(api.jobs.listPublished, {
    search: search || undefined,
    categorySlug: activeCat,
    subcategorySlug: activeSub,
  });
  const seed = useMutation(api.jobs.seedSampleData);

  const activeCategoryId = useMemo(() => {
    if (!activeCat || !categories) return undefined;
    return categories.find((c) => c.slug === activeCat)?._id;
  }, [activeCat, categories]);

  const filteredSubs = useMemo(() => {
    if (!activeCategoryId || !subcategories) return [];
    return subcategories.filter((s) => s.categoryId === activeCategoryId);
  }, [activeCategoryId, subcategories]);

  useEffect(() => {
    setActiveSub(undefined);
  }, [activeCat]);

  const onSeed = async () => {
    if (!user) {
      navigate("/login", { state: { from: "/" } });
      return;
    }
    await seed({});
  };

  return (
    <>
      {/* Hero ----------------------------------------------------------- */}
      <section className="relative pt-32 pb-40 px-8 flex flex-col items-center justify-center text-center overflow-hidden hero-gradient">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
          <svg height="100%" width="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                height="40"
                id="grid"
                patternUnits="userSpaceOnUse"
                width="40"
              >
                <path
                  className="text-outline-variant"
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect fill="url(#grid)" height="100%" width="100%" />
          </svg>
        </div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 className="font-headline text-5xl md:text-[5rem] leading-[1.1] font-bold tracking-tighter text-primary mb-8 drop-shadow-sm">
            Your Journey
            <br />
            Starts Here.
          </h1>
          <p className="font-body text-xl md:text-2xl text-on-surface-variant max-w-2xl mx-auto mb-12 font-light">
            Engineered precision for the next generation of technical talent.
            Discover roles that define the future.
          </p>
          <div className="w-full max-w-2xl mx-auto bg-surface-container-low rounded-xl p-2 flex items-center shadow-[0_32px_64px_-15px_rgba(229,226,225,0.04)] focus-within:ring-2 focus-within:ring-outline-variant transition-all duration-300">
            <Icon name="search" className="text-outline ml-4 mr-3" />
            <input
              className="w-full bg-transparent border-none text-primary placeholder-outline font-body text-lg focus:ring-0 px-2 py-3 outline-none"
              placeholder="Search roles, skills, or companies..."
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <Link
              to="#opportunities"
              className="bg-surface-container-highest text-primary font-label font-medium px-6 py-3 rounded-lg ml-2 hover:bg-surface-variant transition-colors flex items-center gap-2"
            >
              <span>Explore</span>
              <Icon name="arrow_forward" className="text-sm" />
            </Link>
          </div>
        </div>
      </section>

      {/* Categories ----------------------------------------------------- */}
      <section className="py-24 px-8 bg-surface-container-low">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div>
              <h2 className="font-headline text-3xl md:text-4xl font-bold tracking-tight text-primary mb-4">
                Discovery Nodes
              </h2>
              <p className="font-body text-lg text-on-surface-variant">
                Navigate our primary structural sectors.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveCat(undefined);
                setActiveSub(undefined);
              }}
              className="font-label text-sm text-primary uppercase tracking-widest flex items-center gap-2 hover:opacity-70 transition-opacity"
            >
              View All Sectors
              <Icon name="east" className="text-base" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(categories ?? []).map((c) => (
              <button
                key={c._id}
                type="button"
                onClick={() =>
                  setActiveCat((cur) => (cur === c.slug ? undefined : c.slug))
                }
                className={cn(
                  "text-left bg-surface-container-high rounded-xl p-8 hover:bg-surface-container-highest transition-colors duration-300 group cursor-pointer relative overflow-hidden",
                  activeCat === c.slug && "ring-2 ring-primary",
                )}
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Icon name={c.icon} className="text-6xl" />
                </div>
                <div className="bg-surface-container p-4 rounded-lg inline-block mb-6 shadow-sm group-hover:scale-105 transition-transform">
                  <Icon name={c.icon} className="text-primary text-2xl" />
                </div>
                <h3 className="font-headline text-xl font-semibold text-primary mb-2">
                  {c.name}
                </h3>
                <p className="font-body text-sm text-outline mb-6">
                  {c.description}
                </p>
                <div className="flex items-center justify-between text-on-surface-variant text-sm font-label">
                  <span>{activeCat === c.slug ? "Filtering" : "Tap to filter"}</span>
                  <Icon
                    name="arrow_forward"
                    className="opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300"
                  />
                </div>
              </button>
            ))}
            {categories && categories.length === 0 ? (
              <div className="md:col-span-2 lg:col-span-4 text-on-surface-variant text-sm flex items-center justify-between bg-surface-container rounded-xl p-6">
                <span>No categories yet.</span>
                <button
                  type="button"
                  onClick={onSeed}
                  className="bg-primary text-on-primary font-label px-4 py-2 rounded-md text-xs"
                >
                  {user ? "Seed sample data" : "Sign in to seed"}
                </button>
              </div>
            ) : null}
          </div>

          {filteredSubs.length > 0 ? (
            <div className="mt-10 flex flex-wrap gap-2">
              <span className="text-xs font-label uppercase tracking-widest text-on-surface-variant self-center mr-2">
                Refine:
              </span>
              {filteredSubs.map((s) => (
                <button
                  key={s._id}
                  type="button"
                  onClick={() =>
                    setActiveSub((cur) => (cur === s.slug ? undefined : s.slug))
                  }
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-label border transition-colors",
                    activeSub === s.slug
                      ? "bg-primary text-on-primary border-primary"
                      : "border-outline text-on-surface-variant hover:bg-surface-container-high",
                  )}
                >
                  {s.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* Opportunities -------------------------------------------------- */}
      <section id="opportunities" className="py-32 px-8 bg-surface">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6 border-b border-surface-container-low pb-8">
            <div className="w-full md:w-2/3">
              <h2 className="font-headline text-4xl md:text-5xl font-bold tracking-tighter text-primary mb-4">
                Curated Opportunities
              </h2>
              <p className="font-body text-lg text-on-surface-variant max-w-xl">
                High-fidelity signals from leading aerospace and clean-tech
                organizations.
                {activeCat ? (
                  <>
                    {" "}
                    Filtered by{" "}
                    <span className="text-primary">{activeCat}</span>
                    {activeSub ? (
                      <>
                        {" / "}
                        <span className="text-primary">{activeSub}</span>
                      </>
                    ) : null}
                    .
                  </>
                ) : null}
              </p>
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={onSeed}
                className="bg-surface-container-low text-on-surface px-6 py-3 rounded-lg font-label text-sm hover:bg-surface-container-high transition-colors"
              >
                {user ? "Seed sample data" : "Sign in to seed"}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {jobs === undefined ? (
              <SkeletonList />
            ) : jobs.length === 0 ? (
              <EmptyState onSeed={onSeed} signedIn={!!user} />
            ) : (
              jobs.map((j) => <JobCard key={j._id} job={j} />)
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function SkeletonList() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-surface-container-lowest border border-outline-variant/15 p-8 rounded-xl animate-pulse h-32"
        />
      ))}
    </>
  );
}

function EmptyState({
  onSeed,
  signedIn,
}: {
  onSeed: () => void;
  signedIn: boolean;
}) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant/15 p-12 rounded-xl text-center">
      <Icon name="travel_explore" className="text-5xl text-outline mb-4" />
      <h3 className="font-headline text-xl text-primary mb-2">
        No signals received.
      </h3>
      <p className="font-body text-on-surface-variant mb-6">
        Either no jobs are published yet or your filters are too narrow.
      </p>
      <button
        type="button"
        onClick={onSeed}
        className="bg-primary text-on-primary font-label px-6 py-3 rounded-md"
      >
        {signedIn ? "Seed sample data" : "Sign in to seed"}
      </button>
    </div>
  );
}
