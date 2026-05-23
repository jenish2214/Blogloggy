"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { wealthApi, type WealthBookSummary } from "@/lib/api";
import { useActiveBookStore, type ActiveBook } from "@/lib/store/activeBook";
import { syncPortfolioFromCloud } from "@/lib/trading/cloudPortfolio";

const POLL_MS = 8000;

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
  const activeBook = useActiveBookStore((s) => s.activeBook);
  const setActiveBook = useActiveBookStore((s) => s.setActiveBook);
  const [personal, setPersonal] = useState<WealthBookSummary | null>(null);
  const [clientBook, setClientBook] = useState<WealthBookSummary | null>(null);
  const [clientBooks, setClientBooks] = useState<WealthBookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const { books } = await wealthApi.getBooks();
      if (!mounted.current) return;

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
    } catch {
      /* offline */
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [setActiveBook]);

  useEffect(() => {
    mounted.current = true;
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [refresh]);

  const selectPersonal = useCallback(async () => {
    if (!personal) return;
    const book = bookToActive(personal);
    setActiveBook(book);
    await syncPortfolioFromCloud();
  }, [personal, setActiveBook]);

  const selectClient = useCallback(
    async (book?: WealthBookSummary) => {
      const target = book ?? clientBook ?? clientBooks[0];
      if (!target) return;
      const active = bookToActive(target);
      setActiveBook(active);
      setClientBook(target);
      await syncPortfolioFromCloud();
    },
    [clientBook, clientBooks, setActiveBook]
  );

  const isPersonalActive = activeBook?.accountType === "personal";
  const isClientActive = activeBook?.accountType === "client";

  return {
    personal,
    clientBook,
    clientBooks,
    activeBook,
    loading,
    isPersonalActive,
    isClientActive,
    selectPersonal,
    selectClient,
    refresh,
  };
}
