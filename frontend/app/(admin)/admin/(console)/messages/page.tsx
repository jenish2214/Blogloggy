import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const metadata: Metadata = { title: "Messages" };

export default function AdminMessagesPage() {
  return (
    <AdminPlaceholder
      title="Messages"
      description="View and manage system notifications and in-app messages."
    />
  );
}
