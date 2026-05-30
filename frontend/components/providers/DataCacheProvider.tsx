"use client";

import { useEffect, type ReactNode } from "react";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { invalidateAllAppData, invalidateTradingData } from "@/lib/dataInvalidation";
import { ORDER_PLACED_EVENT } from "@/lib/trading/orderEvents";

/** Wire cache invalidation to orders, wallet, and auth — mount once in platform shell */
export function DataCacheProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const onTradingChange = () => invalidateTradingData();
    window.addEventListener(ORDER_PLACED_EVENT, onTradingChange);
    window.addEventListener("wallet-updated", onTradingChange);

    if (!hasSupabaseEnv()) {
      return () => {
        window.removeEventListener(ORDER_PLACED_EVENT, onTradingChange);
        window.removeEventListener("wallet-updated", onTradingChange);
      };
    }

    const supabase = createClient();
    if (!supabase) {
      return () => {
        window.removeEventListener(ORDER_PLACED_EVENT, onTradingChange);
        window.removeEventListener("wallet-updated", onTradingChange);
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "SIGNED_IN" || event === "USER_UPDATED") {
        invalidateAllAppData();
      }
    });

    return () => {
      window.removeEventListener(ORDER_PLACED_EVENT, onTradingChange);
      window.removeEventListener("wallet-updated", onTradingChange);
      subscription.unsubscribe();
    };
  }, []);

  return children;
}
