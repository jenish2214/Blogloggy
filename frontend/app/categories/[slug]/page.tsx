"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { ResearchPaper } from "@/types";
import { ResearchCard } from "@/components/cards/ResearchCard";
import { StaggerList, StaggerItem } from "@/components/animations/StaggerList";
import { AsyncLoad } from "@/components/ui/AsyncLoad";
import { useFetchData } from "@/lib/hooks/useFetchData";

export default function CategoryDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data, loading, error, refetch } = useFetchData(
    () => api.category(slug, 24),
    [slug]
  );

  const category = data?.category ?? null;
  const papers = data?.papers ?? [];

  return (
    <div className="page-main">
      <div className="container">
        <nav className="breadcrumb">
          <Link href="/categories">Categories</Link>
          <span>/</span>
          <span>{category?.name ?? slug}</span>
        </nav>

        <header className="section-header">
          <h1 className="section-title">{category?.name ?? "Category"}</h1>
          <p className="section-subtitle">{category?.description}</p>
        </header>

        <AsyncLoad
          loading={loading}
          error={error}
          onRetry={refetch}
          label="Loading papers from API…"
          skeletonCount={6}
        >
          {papers.length === 0 ? (
            <p className="empty-state">No papers returned from the API for this category.</p>
          ) : (
            <StaggerList className="grid-3">
              {papers.map((p: ResearchPaper) => (
                <StaggerItem key={p.id}>
                  <ResearchCard paper={p} />
                </StaggerItem>
              ))}
            </StaggerList>
          )}
        </AsyncLoad>
      </div>
    </div>
  );
}
