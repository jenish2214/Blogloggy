"use client";

import Link from "next/link";
import { api } from "@/lib/api";
import { DigestCard } from "@/components/cards/DigestCard";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { ApiSectionState } from "@/components/ui/ApiSectionState";
import { useFetchData } from "@/lib/hooks/useFetchData";

export function AIDigestSection() {
  const { data: digest, loading, error, refetch } = useFetchData(() => api.digest(), []);

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
            <RefreshButton onRefresh={refetch} loading={loading} label="Refresh" />
          </div>
        </ScrollReveal>
        <ApiSectionState
          loading={loading}
          error={error}
          onRetry={refetch}
          loadingLabel="Loading digest from API…"
          skeletonCount={2}
          isEmpty={!digest}
          emptyMessage="Digest empty — the API responded but had no items."
        >
          {digest && <DigestCard digest={digest} />}
        </ApiSectionState>
        <p style={{ marginTop: 24 }}>
          <Link href="/digest">Full digest page →</Link>
        </p>
      </div>
    </section>
  );
}
