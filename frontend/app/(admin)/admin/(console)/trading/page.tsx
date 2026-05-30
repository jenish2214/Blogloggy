import type { Metadata } from "next";
import { AdminModuleDataPanel } from "@/components/admin/AdminModuleDataPanel";

export const metadata: Metadata = { title: "Trading Monitor" };
export const dynamic = "force-dynamic";

export default function AdminTradingPage() {
  return <AdminModuleDataPanel apiPath="/api/admin/trading" />;
}
