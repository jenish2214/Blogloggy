import type { Metadata } from "next";
import { AdminModuleDataPanel } from "@/components/admin/AdminModuleDataPanel";

export const metadata: Metadata = { title: "Legal & Compliance" };
export const dynamic = "force-dynamic";

export default function AdminLegalPage() {
  return <AdminModuleDataPanel apiPath="/api/admin/legal" />;
}
