"use client";

import { useEffect } from "react";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { wealthApi } from "@/lib/api";
import { handleAuthSessionChange } from "@/lib/auth/tradingSession";
import { useActiveBookStore } from "@/lib/store/activeBook";
import { syncPortfolioFromCloud } from "@/lib/trading/cloudPortfolio";

/** When signed in, hydrate the local session cache from Supabase (source of truth). */
export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!hasSupabaseEnv()) return;
    const supabase = createClient();
    if (!supabase) return;

    const runSync = async (userId: string) => {
      if (!useActiveBookStore.getState().activeBook) {
        try {
          const { books } = await wealthApi.getBooks();
          const personal = books.find((b) => b.accountType === "personal");
          if (personal) {
            useActiveBookStore.getState().setActiveBook({
              portfolioId: personal.portfolioId,
              clientId: personal.clientId,
              accountType: "personal",
              label: personal.accountLabel,
            });
          }
        } catch {
          /* guest */
        }
      }
      await syncPortfolioFromCloud();
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      handleAuthSessionChange(uid);
      if (uid) void runSync(uid);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const uid = session?.user?.id ?? null;
      if (event === "SIGNED_OUT") {
        handleAuthSessionChange(null);
        return;
      }
      if (!uid) return;
      if (
        event === "SIGNED_IN" ||
        event === "INITIAL_SESSION" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        handleAuthSessionChange(uid);
        void runSync(uid);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let lastPortfolioId: string | undefined;
    return useActiveBookStore.subscribe((state) => {
      const id = state.activeBook?.portfolioId;
      if (!id || id === lastPortfolioId) return;
      lastPortfolioId = id;
      void syncPortfolioFromCloud();
    });
  }, []);

  return <>{children}</>;
}
