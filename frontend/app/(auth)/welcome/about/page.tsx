import { redirect } from "next/navigation";

export default function WelcomeAboutPage() {
  redirect("/welcome/terms");
}
