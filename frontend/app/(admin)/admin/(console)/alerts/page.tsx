import type { Metadata } from "next";
import { AdminModuleDataPanel } from "@/components/admin/AdminModuleDataPanel";

export const metadata: Metadata = { title: "Alerts" };
export const dynamic = "force-dynamic";

export default function AdminAlertsPage() {
  return <AdminModuleDataPanel apiPath="/api/admin/alerts" />;
}
