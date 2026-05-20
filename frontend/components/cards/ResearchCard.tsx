"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ResearchPaper } from "@/types";
import { UniversityBadge } from "@/components/ui/UniversityBadge";
import { topicHref } from "@/lib/topics";
import { timeAgo } from "@/lib/utils";

export function ResearchCard({ paper }: { paper: ResearchPaper }) {
  const borderClass = paper.universitySlug
    ? `uni-border-${paper.universitySlug}`
    : paper.category
      ? `uni-border-${paper.category}`
      : "";

  return (
    <motion.article
      className={`research-card hover-lift ${borderClass}`}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <div className="research-card-meta">
        <UniversityBadge name={paper.university} slug={paper.universitySlug} />
        <span className="research-card-date">{timeAgo(paper.publishedAt)}</span>
      </div>
      <h3 className="research-card-title">
        <Link href={`/paper/${encodeURIComponent(paper.id)}`}>{paper.title}</Link>
      </h3>
      <p className="research-card-abstract">
        {paper.abstract.slice(0, 160)}
        {paper.abstract.length > 160 ? "…" : ""}
      </p>
      <div className="research-card-footer">
        <span className="research-card-source">{paper.source}</span>
        {paper.category && topicHref(paper.category) && (
          <Link href={topicHref(paper.category)!} className="research-card-tldr">
            r/{paper.category}
          </Link>
        )}
      </div>
    </motion.article>
  );
}
