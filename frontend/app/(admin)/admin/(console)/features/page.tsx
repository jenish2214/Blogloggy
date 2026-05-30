import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const metadata: Metadata = { title: "Feature Access" };

export default function AdminFeaturesPage() {
  return (
    <AdminPlaceholder
      title="Feature Access"
      description="Toggle per-user desk modules — markets, trade, quant lab, wealth desk, and more."
    />
  );
}
