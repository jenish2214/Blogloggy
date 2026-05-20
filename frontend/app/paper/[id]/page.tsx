"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import type { ResearchPaper } from "@/types";
import { UniversityBadge } from "@/components/ui/UniversityBadge";
import { ResearchCard } from "@/components/cards/ResearchCard";
import { authorSlug } from "@/lib/slugs";
import { topicHref } from "@/lib/topics";
import { generateBibTeX, excerptSummary } from "@/lib/utils";
import { PageState } from "@/components/ui/PageState";
import { LOADING_PAPERS } from "@/lib/loadingMessages";
import { useFetchData } from "@/lib/hooks/useFetchData";

function PaperContent({
  paper,
  related,
}: {
  paper: ResearchPaper;
  related: ResearchPaper[];
}) {
  const [copied, setCopied] = useState(false);
  const summary = excerptSummary(paper.abstract, 400);
  const tldr = excerptSummary(paper.abstract, 120);

  const handleCite = () => {
    navigator.clipboard.writeText(generateBibTeX(paper));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article className="container">
      <nav className="breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/research">Research</Link>
        <span>/</span>
        <span>Paper</span>
      </nav>

      <header className="paper-detail-header">
        <UniversityBadge name={paper.university} slug={paper.universitySlug} />
        <span className="pill pill-square" style={{ marginLeft: 12 }}>
          {paper.source}
        </span>
        <h1 className="paper-detail-title">{paper.title}</h1>
        <p style={{ color: "var(--color-text-2)" }}>
          {paper.authors.map((a, i) => (
            <span key={a.name}>
              {i > 0 && ", "}
              <Link href={`/authors/${authorSlug(a.name)}`}>{a.name}</Link>
            </span>
          ))}{" "}
          · {paper.year}
          {topicHref(paper.category) && paper.category && (
            <>
              {" "}
              ·{" "}
              <Link href={topicHref(paper.category)!}>r/{paper.category}</Link>
            </>
          )}
        </p>
      </header>

      <section>
        <h2 style={{ fontSize: "1.25rem", marginBottom: 16 }}>Abstract</h2>
        <p style={{ color: "var(--color-text-2)" }}>{paper.abstract}</p>
      </section>

      <section className="paper-ai-summary">
        <h2 style={{ fontSize: "1.25rem", marginBottom: 16 }}>Summary</h2>
        <p style={{ marginBottom: 16 }}>{summary}</p>
        <span className="research-card-tldr">TL;DR: {tldr}</span>
      </section>

      <div style={{ margin: "32px 0" }}>
        <button type="button" className="btn btn-secondary" onClick={handleCite}>
          {copied ? "Copied!" : "Cite this paper"}
        </button>
        <a
          href={paper.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ marginLeft: 12 }}
        >
          View source →
        </a>
      </div>

      {related.length > 0 && (
        <section>
          <h2 className="section-title" style={{ fontSize: "1.5rem", marginBottom: 24 }}>
            Related Papers
          </h2>
          <div className="grid-2">
            {related.map((p) => (
              <ResearchCard key={p.id} paper={p} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

export default function PaperPage() {
  const params = useParams();
  const id = decodeURIComponent(params.id as string);

  const { data, loading, error, refetch } = useFetchData(() => api.paper(id), [id]);

  const paper = data?.paper ?? null;
  const related = data?.related ?? [];

  if (!loading && (error || !paper)) {
    const fallbackUrl = id.startsWith("pubmed-")
      ? `https://pubmed.ncbi.nlm.nih.gov/${id.replace("pubmed-", "")}/`
      : id.startsWith("arxiv-")
        ? `https://arxiv.org/abs/${id.replace("arxiv-", "")}`
        : null;

    return (
      <div className="page-main container">
        <p className="error-banner">{error ?? "Paper not found"}</p>
        {fallbackUrl && (
          <a
            href={fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Open on source site →
          </a>
        )}
        <p style={{ marginTop: 16 }}>
          <Link href="/research">← Back to research</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="page-main">
      <PageState
        loading={loading}
        error={error}
        onRetry={refetch}
        loadingLabel="Loading paper"
        loadingMessages={LOADING_PAPERS}
        skeleton="page"
      >
        {paper && <PaperContent paper={paper} related={related} />}
      </PageState>
    </div>
  );
}
