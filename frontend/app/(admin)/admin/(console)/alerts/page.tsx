import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const metadata: Metadata = { title: "Alerts" };

export default function AdminAlertsPage() {
  return (
    <AdminPlaceholder
      title="Alerts"
      description="Monitor and manage price alerts across all user accounts."
    />
  );
}
