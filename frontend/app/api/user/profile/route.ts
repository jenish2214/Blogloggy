import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  FEATURE_KEYS,
  defaultFeatureAccess,
  normalizeFeatureAccess,
  type FeatureAccessMap,
} from "@/lib/user/featureAccess";
import { ONBOARDING_VERSION } from "@/lib/legal/onboarding";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ profile: null, source: "guest" });
  }

  const { data: row, error: rowErr } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (rowErr?.code === "PGRST205" || rowErr?.message?.includes("user_profiles")) {
    const meta = user.user_metadata ?? {};
    const feature_access = normalizeFeatureAccess(meta.feature_access);
    return NextResponse.json({
      profile: {
        id: user.id,
        full_name: (meta.full_name as string) ?? "",
        feature_access,
        profile_completed_at: meta.profile_completed_at ?? null,
      },
      feature_access,
      source: "metadata",
      hint: "Run supabase migration 20260525100000_user_profiles.sql",
    });
  }

  const meta = user.user_metadata ?? {};
  const feature_access = normalizeFeatureAccess(
    row?.feature_access ?? meta.feature_access
  );

  return NextResponse.json({
    profile: row ?? {
      id: user.id,
      full_name: (meta.full_name as string) ?? (meta.display_name as string) ?? "",
      years_experience: meta.years_experience ?? null,
      experience_level: meta.experience_level ?? null,
      primary_interest: meta.primary_interest ?? null,
      feature_access,
      profile_completed_at: meta.profile_completed_at ?? null,
    },
    feature_access,
    source: row ? "database" : "metadata",
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    full_name?: string;
    years_experience?: number;
    experience_level?: string;
    primary_interest?: string;
    feature_access?: Partial<FeatureAccessMap>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const full_name = String(body.full_name ?? "").trim();
  if (!full_name) {
    return NextResponse.json({ error: "full_name required" }, { status: 400 });
  }

  const years = body.years_experience != null ? Number(body.years_experience) : null;
  const experience_level = body.experience_level ?? null;
  const primary_interest = body.primary_interest?.trim() || null;

  const feature_access = normalizeFeatureAccess({
    ...defaultFeatureAccess(),
    ...body.feature_access,
  });
  feature_access.dashboard = true;

  const now = new Date().toISOString();

  const profileRow = {
    id: user.id,
    full_name,
    years_experience: Number.isFinite(years) ? years : null,
    experience_level,
    primary_interest,
    feature_access,
    profile_completed_at: now,
    updated_at: now,
  };

  const { error: upsertErr } = await supabase.from("user_profiles").upsert(profileRow);

  const { error: metaErr } = await supabase.auth.updateUser({
    data: {
      full_name,
      display_name: full_name,
      years_experience: years,
      experience_level,
      primary_interest,
      feature_access,
      profile_completed_at: now,
      onboarding_version: ONBOARDING_VERSION,
      onboarding_applied_at: now,
    },
  });

  if (metaErr) {
    return NextResponse.json({ error: metaErr.message }, { status: 500 });
  }

  if (upsertErr) {
    const missingTable =
      upsertErr.code === "PGRST205" || upsertErr.message.includes("user_profiles");
    if (!missingTable) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    next: "/",
    feature_access,
    enabled: FEATURE_KEYS.filter((k) => feature_access[k]),
    source: upsertErr ? "metadata" : "database",
  });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const feature_access = body.feature_access
    ? normalizeFeatureAccess(body.feature_access)
    : undefined;

  if (feature_access) feature_access.dashboard = true;

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (feature_access) patch.feature_access = feature_access;
  if (body.full_name) patch.full_name = String(body.full_name).trim();

  if (Object.keys(patch).length > 1) {
    await supabase.from("user_profiles").update(patch).eq("id", user.id);
  }

  if (feature_access) {
    await supabase.auth.updateUser({
      data: { ...user.user_metadata, feature_access },
    });
  }

  return NextResponse.json({ success: true, feature_access });
}
