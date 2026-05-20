"use client";

import Link from "next/link";
import { api } from "@/lib/api";
import { UniversityCard } from "@/components/cards/UniversityCard";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { motion } from "framer-motion";
import { ApiSectionState } from "@/components/ui/ApiSectionState";
import { useFetchData } from "@/lib/hooks/useFetchData";

export function UniversitySection() {
  const { data, loading, error, refetch } = useFetchData(() => api.universities(), []);

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
        <ApiSectionState
          loading={loading}
          error={error}
          onRetry={refetch}
          loadingLabel="Loading universities from API…"
          isEmpty={overview.length === 0}
          emptyMessage="No university data returned from the API."
        >
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
        </ApiSectionState>
        <p style={{ marginTop: 24 }}>
          <Link href="/universities">View all universities →</Link>
        </p>
      </div>
    </section>
  );
}
