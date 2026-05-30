import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const metadata: Metadata = { title: "Trading Monitor" };

export default function AdminTradingPage() {
  return (
    <AdminPlaceholder
      title="Trading Monitor"
      description="Read-only view of orders, open positions, and portfolio snapshots across all users."
    />
  );
}
