"use client";

import { useCallback, useEffect, useState } from "react";
import type { ResearchPaper } from "@/types";
import { api } from "@/lib/api";

export function usePapers(limit = 30) {
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPapers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.research(limit);
      setPapers(data.papers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load papers");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  return { papers, loading, error, refetch: fetchPapers };
}
