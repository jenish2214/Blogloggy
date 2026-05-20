"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { PageShell } from "@/components/layout/PageShell";
import { PageState } from "@/components/ui/PageState";
import { LOADING_CATEGORIES } from "@/lib/loadingMessages";
import { useFetchData } from "@/lib/hooks/useFetchData";

const ICONS: Record<string, string> = {
  brain: "🧠",
  message: "💬",
  server: "⚙️",
  sigma: "∑",
  atom: "⚛",
  heart: "❤",
  eye: "👁",
  graduation: "🎓",
};

export default function CategoriesPage() {
  const { data, loading, error, refetch } = useFetchData(() => api.categories(), []);
  const categories = data?.categories ?? [];

  return (
    <PageShell
      badge="Browse by field"
      title="Research categories"
      subtitle="AI, NLP, systems, biomedical, robotics, and more — papers from free public APIs."
    >
      <PageState
        loading={loading}
        error={error}
        onRetry={refetch}
        loadingLabel="Loading categories"
        loadingMessages={LOADING_CATEGORIES}
        skeleton="cards"
        skeletonCount={8}
      >
          <div className="categories-grid categories-grid-page">
            {categories.map((c, i) => (
              <motion.div
                key={c.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link href={`/categories/${c.slug}`} className="category-card">
                  <span className="category-icon">{ICONS[c.icon] ?? "📄"}</span>
                  <h3>{c.name}</h3>
                  <p>{c.description}</p>
                  <span className="category-link">View papers →</span>
                </Link>
              </motion.div>
            ))}
          </div>
      </PageState>
    </PageShell>
  );
}
