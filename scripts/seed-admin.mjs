/**
 * Creates or updates the QuantDesk admin user in Supabase Auth.
 * Run from repo root: npm run seed:admin
 *
 * Default credentials:
 *   Email:    admin@quantdesk.com
 *   Password: Admin@12345
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim() || "admin@quantdesk.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim() || "Admin@12345";
const ADMIN_NAME = "QuantDesk Admin";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(resolve(ROOT, "frontend/.env.local"));
loadEnvFile(resolve(ROOT, "frontend/.env"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in frontend/.env.local"
  );
  process.exit(1);
}

const authHeaders = {
  Authorization: `Bearer ${serviceKey}`,
  apikey: serviceKey,
  "Content-Type": "application/json",
};

async function listAllUsers() {
  const users = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=200`, {
      headers: authHeaders,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || data.message || res.statusText);
    users.push(...(data.users ?? []));
    if ((data.users?.length ?? 0) < 200) break;
    page += 1;
  }
  return users;
}

async function main() {
  console.log(`Seeding admin user in Supabase: ${ADMIN_EMAIL}`);

  const existing = (await listAllUsers()).find(
    (u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );

  let userId;

  if (existing) {
    const res = await fetch(`${url}/auth/v1/admin/users/${existing.id}`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({
        password: ADMIN_PASSWORD,
        email_confirm: true,
        app_metadata: { ...(existing.app_metadata ?? {}), role: "admin" },
        user_metadata: {
          ...(existing.user_metadata ?? {}),
          full_name: ADMIN_NAME,
          display_name: ADMIN_NAME,
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || data.message || res.statusText);
    userId = data.id;
    console.log("Updated existing admin user:", userId);
  } else {
    const res = await fetch(`${url}/auth/v1/admin/users`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        app_metadata: { role: "admin" },
        user_metadata: { full_name: ADMIN_NAME, display_name: ADMIN_NAME },
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || data.message || res.statusText);
    userId = data.id;
    console.log("Created admin user:", userId);
  }

  const profileRes = await fetch(`${url}/rest/v1/user_profiles`, {
    method: "POST",
    headers: {
      ...authHeaders,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: userId,
      full_name: ADMIN_NAME,
      profile_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  });

  if (!profileRes.ok) {
    const err = await profileRes.text();
    if (!err.includes("user_profiles")) {
      console.warn("user_profiles upsert:", err);
    }
  }

  console.log("\nAdmin stored in Supabase Auth:");
  console.log("  Email:   ", ADMIN_EMAIL);
  console.log("  Password:", ADMIN_PASSWORD);
  console.log("  Role:     app_metadata.role = admin");
  console.log("  Login:    http://localhost:3000/admin/login");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
