import nextDynamic from "next/dynamic";

const SignupForm = nextDynamic(
  () => import("./SignupForm").then((m) => m.SignupForm),
  { ssr: false }
);

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return <SignupForm />;
}
