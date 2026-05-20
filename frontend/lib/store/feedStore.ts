import { create } from "zustand";
import type { FeedItem } from "@/types";

interface FeedState {
  items: FeedItem[];
  enabledSources: string[];
  setItems: (items: FeedItem[]) => void;
  toggleSource: (source: string) => void;
}

const ALL_SOURCES = [
  "hn-rss",
  "techcrunch-rss",
  "verge-rss",
  "arstechnica-rss",
  "mit-tr-rss",
  "anthropic-rss",
  "openai-rss",
  "arxiv",
  "deepmind-rss",
  "mit-rss",
  "harvard-rss",
  "stanford-rss",
  "oxford-rss",
  "cambridge-rss",
];

export const useFeedStore = create<FeedState>((set) => ({
  items: [],
  enabledSources: ALL_SOURCES,
  setItems: (items) => set({ items }),
  toggleSource: (source) =>
    set((state) => {
      const enabled = state.enabledSources.includes(source)
        ? state.enabledSources.filter((s) => s !== source)
        : [...state.enabledSources, source];
      return { enabledSources: enabled };
    }),
}));
