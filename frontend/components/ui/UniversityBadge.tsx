const SLUG_CLASS: Record<string, string> = {
  mit: "uni-accent-mit",
  harvard: "uni-accent-harvard",
  stanford: "uni-accent-stanford",
  oxford: "uni-accent-oxford",
  cambridge: "uni-accent-cambridge",
  cmu: "uni-accent-cmu",
  berkeley: "uni-accent-berkeley",
  deepmind: "uni-accent-deepmind",
  anthropic: "uni-accent-deepmind",
};

export function UniversityBadge({
  name,
  slug,
}: {
  name: string;
  slug?: string;
}) {
  const cls = slug ? SLUG_CLASS[slug] ?? "" : "";
  return <span className={`university-badge ${cls}`}>{name}</span>;
}
