import type { Metadata } from "next";
import { AdminModuleDataPanel } from "@/components/admin/AdminModuleDataPanel";

export const metadata: Metadata = { title: "System Health" };
export const dynamic = "force-dynamic";

export default function AdminSystemPage() {
  return <AdminModuleDataPanel apiPath="/api/admin/system" />;
}
