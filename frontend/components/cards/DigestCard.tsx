import type { DailyDigest } from "@/types";

export function DigestCard({ digest }: { digest: DailyDigest }) {
  return (
    <div className="digest-card">
      <div className="digest-card-header">
        <span className="digest-provider">From live research data</span>
        <time dateTime={digest.generatedAt}>
          {new Date(digest.generatedAt).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </time>
      </div>
      <p className="digest-preview">
        {digest.topPapers
          .slice(0, 3)
          .map((p) => p.summary)
          .join(" ")}
      </p>
      <ul className="digest-paper-list">
        {digest.topPapers.slice(0, 5).map((p) => (
          <li key={p.title}>
            <strong>{p.title}</strong>
            <span className="digest-impact">Impact {p.impactScore}/10</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
