import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const metadata: Metadata = { title: "System Health" };

export default function AdminSystemPage() {
  return (
    <AdminPlaceholder
      title="System Health"
      description="API health checks, circuit breaker states, and live metrics for platform services."
    />
  );
}
