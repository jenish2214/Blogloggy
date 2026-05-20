"use client";

import Link from "next/link";
import { api } from "@/lib/api";
import type { ResearchCategory } from "@/types";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { motion } from "framer-motion";
import { LoadingGrid, LoadingSpinner } from "@/components/ui/LoadingSpinner";
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

export function CategoriesSection() {
  const { data, loading } = useFetchData(() => api.categories(), []);

  const categories = data?.categories ?? [];

  return (
    <section className="section" id="categories">
      <div className="container">
        <ScrollReveal>
          <div className="section-header">
            <h2 className="section-title">Research by Category</h2>
            <p className="section-subtitle">
              Browse papers and articles organized by research field
            </p>
          </div>
        </ScrollReveal>
        {loading ? (
          <div className="async-load-section">
            <LoadingSpinner label="Loading categories…" />
            <LoadingGrid count={4} />
          </div>
        ) : (
          <div className="categories-grid">
            {categories.map((c) => (
              <motion.div
                key={c.slug}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.22 }}
              >
                <Link href={`/categories/${c.slug}`} className="category-card">
                  <span className="category-icon">{ICONS[c.icon] ?? "📄"}</span>
                  <h3>{c.name}</h3>
                  <p>{c.description}</p>
                  <span className="category-link">Explore →</span>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
