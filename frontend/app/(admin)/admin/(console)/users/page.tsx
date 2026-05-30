import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const metadata: Metadata = { title: "Users" };

export default function AdminUsersPage() {
  return (
    <AdminPlaceholder
      title="Users"
      description="Search users, view profiles, and track onboarding status across the platform."
    />
  );
}
