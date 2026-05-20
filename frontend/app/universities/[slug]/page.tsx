"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { authorSlug } from "@/lib/slugs";
import { ResearchCard } from "@/components/cards/ResearchCard";
import { StaggerList, StaggerItem } from "@/components/animations/StaggerList";
import { AsyncLoad } from "@/components/ui/AsyncLoad";
import { useFetchData } from "@/lib/hooks/useFetchData";

export default function UniversityDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data, loading, error } = useFetchData(
    () => api.university(slug),
    [slug]
  );

  const university = data?.university;
  const papers = data?.papers ?? [];
  const researchers = data?.researchers ?? [];
  const topCited = data?.topCited ?? [];

  return (
    <div className="page-main">
      <div className="container">
        <AsyncLoad
          loading={loading}
          error={error || (!loading && !university ? "University not found" : null)}
          label="Loading university research…"
          variant="page"
        >
          {university && (
            <>
              <nav className="breadcrumb">
                <Link href="/universities">Universities</Link>
                <span>/</span>
                <span>{university.name}</span>
              </nav>

              <header
                className={`uni-border-${slug}`}
                style={{
                  borderLeftWidth: 6,
                  paddingLeft: 24,
                  marginBottom: 40,
                }}
              >
                <h1
                  className="section-title"
                  style={{ color: `var(${university.accentColor})` }}
                >
                  {university.name}
                </h1>
                <p className="section-subtitle">{university.description}</p>
              </header>

              <div className="university-detail-layout">
                <StaggerList className="grid-2">
                  {papers.map((p) => (
                    <StaggerItem key={p.id}>
                      <ResearchCard paper={p} />
                    </StaggerItem>
                  ))}
                </StaggerList>

                <aside className="detail-sidebar">
                  <h3>Key Researchers</h3>
                  <ul className="researcher-list">
                    {researchers.map((r) => (
                      <li key={r.name}>
                        <Link href={`/authors/${authorSlug(r.name)}`}>{r.name}</Link>
                        <span style={{ color: "var(--color-text-3)" }}> ({r.count})</span>
                      </li>
                    ))}
                  </ul>
                  <h3 style={{ marginTop: 32 }}>Most Cited This Month</h3>
                  <ul className="researcher-list">
                    {topCited.map((p) => (
                      <li key={p.id}>
                        <Link href={`/paper/${encodeURIComponent(p.id)}`}>
                          {p.title.slice(0, 50)}…
                        </Link>
                        {p.citationCount != null && (
                          <span style={{ color: "var(--color-accent-ai)" }}>
                            {" "}
                            {p.citationCount} cites
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </aside>
              </div>
            </>
          )}
        </AsyncLoad>
        {!loading && !university && !error && (
          <Link href="/universities">← Back to universities</Link>
        )}
      </div>
    </div>
  );
}
