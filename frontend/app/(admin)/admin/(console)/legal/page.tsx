import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const metadata: Metadata = { title: "Legal & Compliance" };

export default function AdminLegalPage() {
  return (
    <AdminPlaceholder
      title="Legal & Compliance"
      description="Audit terms acceptance, onboarding completion, and compliance metadata."
    />
  );
}
