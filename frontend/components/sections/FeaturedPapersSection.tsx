"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { StaggerList, StaggerItem } from "@/components/animations/StaggerList";
import { ResearchCard } from "@/components/cards/ResearchCard";
import { LoadingGrid, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useFetchData } from "@/lib/hooks/useFetchData";

export function FeaturedPapersSection() {
  const { data, loading } = useFetchData(() => api.research(6), []);

  const papers = data?.papers?.slice(0, 6) ?? [];

  return (
    <section className="section section-featured">
      <div className="container">
        <ScrollReveal>
          <div className="section-header section-header-row">
            <div>
              <h2 className="section-title">Latest Highlights</h2>
              <p className="section-subtitle">
                Fresh papers from top labs — open any post for the full abstract
              </p>
            </div>
            <Link href="/research" className="btn btn-secondary btn-sm">
              View full feed →
            </Link>
          </div>
        </ScrollReveal>

        {loading ? (
          <div className="async-load-section">
            <LoadingSpinner label="Loading highlights…" />
            <LoadingGrid count={3} />
          </div>
        ) : papers.length === 0 ? (
          <p className="empty-state">
            Highlights unavailable. Start the API on port 4000, then refresh.
          </p>
        ) : (
          <StaggerList className="grid-3 featured-papers-grid">
            {papers.map((p) => (
              <StaggerItem key={p.id}>
                <ResearchCard paper={p} />
              </StaggerItem>
            ))}
          </StaggerList>
        )}

        <motion.div
          className="featured-cta-bar"
          initial={{ opacity: 0, scaleX: 0.6 }}
          whileInView={{ opacity: 1, scaleX: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link href="/digest" className="featured-cta-link">
            Today&apos;s digest
          </Link>
          <span className="featured-cta-sep" aria-hidden />
          <Link href="/news" className="featured-cta-link">
            Tech news
          </Link>
          <span className="featured-cta-sep" aria-hidden />
          <Link href="/topics" className="featured-cta-link">
            Browse topics
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
