import nextDynamic from "next/dynamic";
import { Suspense } from "react";
import { AuthFormFallback } from "@/components/auth/AuthFormFallback";

const LoginForm = nextDynamic(
  () => import("./LoginForm").then((m) => m.LoginForm),
  { ssr: false, loading: () => <AuthFormFallback /> }
);

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
