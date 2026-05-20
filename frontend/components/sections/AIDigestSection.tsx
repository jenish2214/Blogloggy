"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DailyDigest } from "@/types";
import { DigestCard } from "@/components/cards/DigestCard";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { LoadingGrid, LoadingSpinner } from "@/components/ui/LoadingSpinner";

export function AIDigestSection() {
  const [digest, setDigest] = useState<DailyDigest | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const d = await api.digest();
      setDigest(d);
    } catch {
      setDigest(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="section">
      <div className="container">
        <ScrollReveal>
          <div
            className="section-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <h2 className="section-title">Today&apos;s Research Digest</h2>
              <p className="section-subtitle">
                Today&apos;s most notable papers and findings
              </p>
            </div>
            <RefreshButton onRefresh={load} loading={loading} label="Refresh" />
          </div>
        </ScrollReveal>
        {loading && !digest ? (
          <div className="async-load-section">
            <LoadingSpinner label="Loading digest…" />
            <LoadingGrid count={2} />
          </div>
        ) : digest ? (
          <DigestCard digest={digest} />
        ) : (
          <p className="empty-state">
            Digest unavailable. Start the API server on port 4000.
          </p>
        )}
        <p style={{ marginTop: 24 }}>
          <Link href="/digest">Full digest page →</Link>
        </p>
      </div>
    </section>
  );
}
