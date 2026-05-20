export function authorSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const TOPIC_ICONS: Record<string, string> = {
  brain: "🧠",
  message: "💬",
  server: "⚙️",
  sigma: "∑",
  atom: "⚛",
  heart: "❤",
  eye: "👁",
  graduation: "🎓",
};
