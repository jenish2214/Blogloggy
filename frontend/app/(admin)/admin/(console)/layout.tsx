import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/auth/admin";
import { getStaticAdminSessionEmail } from "@/lib/auth/adminSession";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staticEmail = await getStaticAdminSessionEmail();

  let userEmail = staticEmail;
  if (!staticEmail) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdminUser(user)) {
      redirect("/admin/login");
    }
    userEmail = user.email ?? null;
  }

  return <AdminShell userEmail={userEmail}>{children}</AdminShell>;
}
