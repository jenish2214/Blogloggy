"use client";

import { useEffect, useState } from "react";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import {
  defaultFeatureAccess,
  getFeatureAccessFromUser,
  type FeatureAccessMap,
} from "@/lib/user/featureAccess";

export function useFeatureAccess() {
  const [access, setAccess] = useState<FeatureAccessMap>(defaultFeatureAccess());
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const sync = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setSignedIn(!!user);
      if (!user) {
        setAccess(defaultFeatureAccess());
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/user/profile", { credentials: "same-origin" });
        const j = await res.json();
        if (j.feature_access) {
          setAccess(j.feature_access);
        } else {
          setAccess(getFeatureAccessFromUser(user));
        }
      } catch {
        setAccess(getFeatureAccessFromUser(user));
      }
      setLoading(false);
    };

    void sync();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => void sync());
    return () => subscription.unsubscribe();
  }, []);

  return { access, loading, signedIn, allEnabled: !signedIn };
}
