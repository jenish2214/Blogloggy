"use client";

import Link from "next/link";
import { api } from "@/lib/api";
import { UniversityCard } from "@/components/cards/UniversityCard";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { motion } from "framer-motion";
import { LoadingGrid, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useFetchData } from "@/lib/hooks/useFetchData";

export function UniversitySection() {
  const { data, loading } = useFetchData(() => api.universities(), []);

  const overview = data?.overview ?? [];

  return (
    <section className="section">
      <div className="container">
        <ScrollReveal>
          <div className="section-header">
            <h2 className="section-title">Top University Research</h2>
            <p className="section-subtitle">
              Doctoral and faculty research from MIT, Harvard, Stanford, Oxford, and more
            </p>
          </div>
        </ScrollReveal>
        {loading ? (
          <div className="async-load-section">
            <LoadingSpinner label="Loading university data…" />
            <LoadingGrid count={4} />
          </div>
        ) : (
          <div className="university-scroll">
            {overview.map((u) => (
              <motion.div
                key={u.slug}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.22 }}
              >
                <UniversityCard {...u} />
              </motion.div>
            ))}
          </div>
        )}
        <p style={{ marginTop: 24 }}>
          <Link href="/universities">View all universities →</Link>
        </p>
      </div>
    </section>
  );
}
