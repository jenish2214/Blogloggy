import type { Metadata } from "next";
import { AdminDashboardPanel } from "@/components/admin/AdminDashboardPanel";

export const metadata: Metadata = {
  title: "Admin Dashboard",
};

export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  return <AdminDashboardPanel />;
}
