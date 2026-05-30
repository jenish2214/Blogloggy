import type { Metadata } from "next";
import { AdminModuleDataPanel } from "@/components/admin/AdminModuleDataPanel";

export const metadata: Metadata = { title: "Wealth & Clients" };
export const dynamic = "force-dynamic";

export default function AdminWealthPage() {
  return <AdminModuleDataPanel apiPath="/api/admin/wealth" />;
}
