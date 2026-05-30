"use client";

import { useEffect, useState } from "react";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { userApi } from "@/lib/api";
import { getClientCache } from "@/lib/clientFetchCache";
import {
  defaultFeatureAccess,
  getFeatureAccessFromUser,
  type FeatureAccessMap,
} from "@/lib/user/featureAccess";

const PROFILE_CACHE_KEY = "GET:/api/user/profile";

export function useFeatureAccess() {
  const cached = getClientCache<{ feature_access?: FeatureAccessMap }>(PROFILE_CACHE_KEY);
  const [access, setAccess] = useState<FeatureAccessMap>(
    () => cached?.feature_access ?? defaultFeatureAccess()
  );
  const [loading, setLoading] = useState(!cached);
  const [signedIn, setSignedIn] = useState(!!cached);

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
        const j = await userApi.getProfile();
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
