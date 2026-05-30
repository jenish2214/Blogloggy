import { redirect } from "next/navigation";

export default function WalletPage({
  searchParams,
}: {
  searchParams?: { section?: string };
}) {
  const section = searchParams?.section;
  if (section === "orders") redirect("/trade");
  if (section === "profile") redirect("/profile");
  redirect("/desk?section=wallet");
}
