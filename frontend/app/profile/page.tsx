import { redirect } from "next/navigation";

export default function ProfilePage() {
  redirect("/desk?section=profile");
}
