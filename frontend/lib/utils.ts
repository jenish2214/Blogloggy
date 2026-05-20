function parseDate(dateStr: string): Date | null {
  if (!dateStr?.trim()) return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatAbsoluteTime(dateStr: string): string {
  const d = parseDate(dateStr);
  if (!d) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function timeAgo(dateStr: string): string {
  const d = parseDate(dateStr);
  if (!d) return "—";
  const diff = Date.now() - d.getTime();
  if (diff < 0) return "just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return formatAbsoluteTime(dateStr);
}

/** Relative + absolute label for live/news posts */
export function formatFeedTime(dateStr: string): { relative: string; absolute: string } {
  const absolute = formatAbsoluteTime(dateStr);
  return {
    relative: timeAgo(dateStr),
    absolute: absolute || "Unknown date",
  };
}

export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len - 1) + "…";
}

export function isNewItem(pubDate: string, minutes = 10): boolean {
  const d = parseDate(pubDate);
  if (!d) return false;
  return Date.now() - d.getTime() < minutes * 60 * 1000;
}

export function excerptSummary(text: string, max = 200): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + "…";
}

export function generateBibTeX(paper: {
  id: string;
  title: string;
  authors: { name: string }[];
  year: number;
  sourceUrl?: string;
}): string {
  const key = paper.id.replace(/[^a-zA-Z0-9]/g, "");
  const authors = paper.authors.map((a) => a.name).join(" and ");
  return `@article{${key},
  title={${paper.title}},
  author={${authors}},
  year={${paper.year}},
  url={${paper.sourceUrl ?? ""}}
}`;
}
