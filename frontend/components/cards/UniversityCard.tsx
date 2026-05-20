"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { timeAgo } from "@/lib/utils";

export function UniversityCard({
  slug,
  name,
  accentColor,
  paperCount,
  lastUpdated,
  latestTitles,
}: {
  slug: string;
  name: string;
  accentColor: string;
  paperCount: number;
  lastUpdated: string;
  latestTitles: string[];
}) {
  const borderClass = `uni-border-${slug}`;

  return (
    <motion.div
      className={`university-card ${borderClass}`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.22 }}
    >
      <Link href={`/universities/${slug}`} className="university-card-link">
        <h3 className="university-card-name" style={{ color: `var(${accentColor})` }}>
          {name}
        </h3>
        <p className="university-card-count">{paperCount} papers</p>
        <p className="university-card-updated">Updated {timeAgo(lastUpdated)}</p>
        {latestTitles.length > 0 && (
          <ul className="university-card-titles">
            {latestTitles.map((t) => (
              <li key={t}>{t.slice(0, 60)}{t.length > 60 ? "…" : ""}</li>
            ))}
          </ul>
        )}
      </Link>
    </motion.div>
  );
}
