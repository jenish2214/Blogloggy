import type { Metadata } from "next";
import { AdminModuleDataPanel } from "@/components/admin/AdminModuleDataPanel";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default function AdminMessagesPage() {
  return <AdminModuleDataPanel apiPath="/api/admin/messages" />;
}
