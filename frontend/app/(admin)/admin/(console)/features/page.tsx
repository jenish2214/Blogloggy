import type { Metadata } from "next";
import { AdminModuleDataPanel } from "@/components/admin/AdminModuleDataPanel";

export const metadata: Metadata = { title: "Feature Access" };
export const dynamic = "force-dynamic";

export default function AdminFeaturesPage() {
  return <AdminModuleDataPanel apiPath="/api/admin/features" />;
}
