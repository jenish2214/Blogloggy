"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSupabaseSession } from "@/lib/auth/useSupabaseSession";
import { wealthApi, type WealthBookSummary } from "@/lib/api";
import { getClientCache } from "@/lib/clientFetchCache";
import { useDocumentVisible } from "@/lib/hooks/useDocumentVisible";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { useActiveBookStore, type ActiveBook } from "@/lib/store/activeBook";
import { syncPortfolioFromCloud } from "@/lib/trading/cloudPortfolio";

const BOOKS_CACHE_KEY = "GET:/api/wealth/books";
const POLL_MS = 30_000;

function bookToActive(b: WealthBookSummary): ActiveBook {
  return {
    portfolioId: b.portfolioId,
    clientId: b.clientId,
    accountType: b.accountType,
    label: b.accountLabel,
    clientCode: b.clientCode ?? undefined,
  };
}

export function useDualProfiles() {
  const { isAuthenticated, ready: sessionReady } = useSupabaseSession();
  const visible = useDocumentVisible();
  const activeBook = useActiveBookStore((s) => s.activeBook);
  const setActiveBook = useActiveBookStore((s) => s.setActiveBook);
  const cached = getClientCache<{ books: WealthBookSummary[] }>(BOOKS_CACHE_KEY);

  const [personal, setPersonal] = useState<WealthBookSummary | null>(
    () => cached?.books.find((b) => b.accountType === "personal") ?? null
  );
  const [clientBook, setClientBook] = useState<WealthBookSummary | null>(null);
  const [clientBooks, setClientBooks] = useState<WealthBookSummary[]>(
    () => cached?.books.filter((b) => b.accountType === "client") ?? []
  );
  const [loading, setLoading] = useState(!cached);
  const mounted = useRef(true);

  const applyBooks = useCallback(
    (books: WealthBookSummary[]) => {
      const personalB = books.find((b) => b.accountType === "personal") ?? null;
      const clients = books.filter((b) => b.accountType === "client");
      setPersonal(personalB);
      setClientBooks(clients);

      const current = useActiveBookStore.getState().activeBook;
      let clientDisplay: WealthBookSummary | null = null;

      if (current?.accountType === "client" && current.clientId) {
        clientDisplay = clients.find((b) => b.clientId === current.clientId) ?? null;
      } else if (current?.accountType === "client") {
        clientDisplay = clients.find((b) => b.portfolioId === current.portfolioId) ?? null;
      }

      if (!clientDisplay && clients.length > 0) {
        const stored = useActiveBookStore.getState().activeBook;
        if (stored?.clientId) {
          clientDisplay = clients.find((b) => b.clientId === stored.clientId) ?? clients[0];
        } else {
          clientDisplay = clients[0];
        }
      }

      setClientBook(clientDisplay);

      if (!current && personalB) {
        setActiveBook(bookToActive(personalB));
      }
    },
    [setActiveBook]
  );

  const refresh = useCallback(
    async (force = false) => {
      if (!hasSupabaseEnv() || !isAuthenticated) {
        if (mounted.current) {
          setPersonal(null);
          setClientBook(null);
          setClientBooks([]);
          setLoading(false);
        }
        return;
      }
      try {
        const { books } = await wealthApi.getBooks(force);
        if (!mounted.current) return;
        applyBooks(books);
      } catch {
        /* offline */
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [isAuthenticated, applyBooks]
  );

  useEffect(() => {
    mounted.current = true;
    if (!sessionReady) return;
    if (cached?.books.length) applyBooks(cached.books);
    void refresh(false);
    if (!isAuthenticated || !visible) {
      return () => {
        mounted.current = false;
      };
    }
    const id = setInterval(() => void refresh(false), POLL_MS);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [sessionReady, isAuthenticated, visible, refresh, applyBooks]);

  const selectPersonal = useCallback(async () => {
    if (!personal) return;
    const book = bookToActive(personal);
    setActiveBook(book);
    await syncPortfolioFromCloud();
  }, [personal, setActiveBook]);

  const selectClient = useCallback(
    async (book?: WealthBookSummary) => {
      const target = book ?? clientBook;
      if (!target) return;
      setActiveBook(bookToActive(target));
      await syncPortfolioFromCloud();
    },
    [clientBook, setActiveBook]
  );

  const isPersonalActive =
    activeBook?.accountType === "personal" || (!activeBook && !!personal);
  const isClientActive = activeBook?.accountType === "client";

  return {
    personal,
    clientBook,
    clientBooks,
    activeBook,
    loading,
    refresh,
    selectPersonal,
    selectClient,
    isPersonalActive,
    isClientActive,
  };
}
