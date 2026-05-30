import nextDynamic from "next/dynamic";
import { Suspense } from "react";
import { AuthFormFallback } from "@/components/auth/AuthFormFallback";

const SignupForm = nextDynamic(
  () => import("./SignupForm").then((m) => m.SignupForm),
  { ssr: false, loading: () => <AuthFormFallback /> }
);

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <Suspense fallback={<AuthFormFallback />}>
      <SignupForm />
    </Suspense>
  );
}
