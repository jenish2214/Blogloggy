"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { AsyncLoad } from "@/components/ui/AsyncLoad";
import { useFetchData } from "@/lib/hooks/useFetchData";

const FILTERS = ["All", "CS/AI", "Biology", "Physics", "Economics", "Medicine"];

const FILTER_SLUGS: Record<string, string[]> = {
  All: ["mit", "harvard", "stanford", "oxford", "cambridge", "cmu", "berkeley", "deepmind"],
  "CS/AI": ["mit", "stanford", "cmu", "berkeley", "deepmind"],
  Biology: ["harvard", "stanford", "oxford"],
  Physics: ["mit", "oxford", "cambridge"],
  Economics: ["harvard", "stanford"],
  Medicine: ["harvard", "stanford", "oxford"],
};

export default function UniversitiesPage() {
  const [filter, setFilter] = useState("All");
  const { data, loading, error, refetch } = useFetchData(() => api.universities(), []);

  const overview = data?.overview ?? [];
  const descriptions: Record<string, string> = {};
  data?.universities.forEach((u) => {
    descriptions[u.slug] = u.description;
  });

  const slugs = FILTER_SLUGS[filter] ?? FILTER_SLUGS.All;
  const filtered = overview.filter((u) => slugs.includes(u.slug));

  return (
    <div className="page-main">
      <div className="container">
        <ScrollReveal>
          <header className="section-header">
            <h1 className="section-title">University Research Hub</h1>
            <p className="section-subtitle">
              Explore doctoral-level research from the world&apos;s leading institutions
            </p>
          </header>
        </ScrollReveal>

        <div className="filter-bar">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`filter-btn ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        <AsyncLoad
          loading={loading}
          error={error}
          onRetry={refetch}
          label="Loading universities from API…"
          skeletonCount={8}
        >
          <div
            className="grid-2"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
          >
            {filtered.map((u) => (
              <div key={u.slug} className={`university-card uni-border-${u.slug}`}>
                <Link href={`/universities/${u.slug}`}>
                  <h3
                    style={{
                      color: `var(${u.accentColor})`,
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {u.name}
                  </h3>
                  <p
                    style={{
                      color: "var(--color-text-2)",
                      fontSize: "0.85rem",
                      margin: "8px 0",
                    }}
                  >
                    {descriptions[u.slug]?.slice(0, 100)}…
                  </p>
                  <p className="university-card-count">{u.paperCount} papers</p>
                  <ul className="university-card-titles">
                    {u.latestTitles.map((t) => (
                      <li key={t}>{t.slice(0, 70)}…</li>
                    ))}
                  </ul>
                </Link>
              </div>
            ))}
          </div>
        </AsyncLoad>
      </div>
    </div>
  );
}
