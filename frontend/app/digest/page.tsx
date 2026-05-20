"use client";

import { api } from "@/lib/api";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { PageShell } from "@/components/layout/PageShell";
import { PageState } from "@/components/ui/PageState";
import { LOADING_PAPERS } from "@/lib/loadingMessages";
import { useFetchData } from "@/lib/hooks/useFetchData";

export default function DigestPage() {
  const { data: digest, loading, error, refetch } = useFetchData(
    () => api.digest(),
    []
  );

  return (
    <PageShell
      badge="Daily brief"
      title="Research digest"
      subtitle={
        digest
          ? new Date(digest.generatedAt).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }) + " · Curated from live papers"
          : "Curated from latest research papers"
      }
      actions={<RefreshButton onRefresh={refetch} loading={loading} label="Refresh" />}
    >
      <PageState
        loading={loading}
        error={error}
        onRetry={refetch}
        loadingLabel="Building today's digest"
        loadingMessages={LOADING_PAPERS}
        skeleton="grid"
      >
          {digest && (
            <>
              <section style={{ marginBottom: 64 }}>
                <h2
                  className="section-title"
                  style={{ fontSize: "1.5rem", marginBottom: 24 }}
                >
                  Top 5 Papers Today
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  {digest.topPapers.map((p, i) => (
                    <article
                      key={p.title + i}
                      className="research-card"
                      style={{ borderLeftColor: "var(--color-accent-ai)" }}
                    >
                      <span className="university-badge">{p.university}</span>
                      <h3
                        style={{
                          margin: "12px 0",
                          fontFamily: "var(--font-display)",
                        }}
                      >
                        {p.title}
                      </h3>
                      <p style={{ color: "var(--color-text-2)" }}>{p.summary}</p>
                      <p style={{ marginTop: 12 }}>
                        <strong>Why it matters:</strong> {p.whyItMatters}
                      </p>
                      <div
                        style={{
                          marginTop: 16,
                          display: "flex",
                          gap: 16,
                          alignItems: "center",
                        }}
                      >
                        <span className="digest-impact">
                          Impact {p.impactScore}/10
                        </span>
                        {p.sourceUrl && (
                          <a
                            href={p.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Read source →
                          </a>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section>
                <h2
                  className="section-title"
                  style={{ fontSize: "1.5rem", marginBottom: 24 }}
                >
                  Weekly Trends
                </h2>
                <ul
                  style={{
                    listStyle: "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {digest.weeklyThemes.map((theme) => (
                    <li
                      key={theme}
                      className="pill"
                      style={{
                        justifyContent: "flex-start",
                        padding: "12px 20px",
                      }}
                    >
                      {theme}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
      </PageState>
    </PageShell>
  );
}
