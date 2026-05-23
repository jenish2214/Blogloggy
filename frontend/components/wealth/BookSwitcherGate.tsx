"use client";

import { usePathname } from "next/navigation";
import { DualProfileBar } from "./DualProfileBar";

const HIDE = ["/login", "/signup", "/terms", "/wealth", "/welcome"];

export function BookSwitcherGate() {
  const path = usePathname();
  if (HIDE.some((p) => path.startsWith(p))) return null;
  return <DualProfileBar variant="full" />;
}
