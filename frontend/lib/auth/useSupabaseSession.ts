"use client";

import { useEffect, useState } from "react";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

/** Browser Supabase session — use before calling user-scoped API routes. */
export function useSupabaseSession() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(!hasSupabaseEnv());

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      setReady(true);
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setReady(true);
      return;
    }

    const apply = (id: string | null) => {
      setUserId(id);
      setReady(true);
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      apply(session?.user?.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { userId, isAuthenticated: Boolean(userId), ready };
}
