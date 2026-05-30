import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const metadata: Metadata = { title: "Wealth & Clients" };

export default function AdminWealthPage() {
  return (
    <AdminPlaceholder
      title="Wealth & Clients"
      description="Manage advisors, client books, and broker profiles across the wealth desk."
    />
  );
}
