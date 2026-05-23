import nextDynamic from "next/dynamic";
import { Suspense } from "react";

const LoginForm = nextDynamic(
  () => import("./LoginForm").then((m) => m.LoginForm),
  { ssr: false }
);

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
