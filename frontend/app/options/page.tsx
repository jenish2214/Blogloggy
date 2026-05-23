import { redirect } from "next/navigation";

export default function OptionsPage() {
  redirect("/forex-options?section=options");
}
