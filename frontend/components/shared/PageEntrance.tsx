"use client";

import { usePathname } from "next/navigation";

/** Smooth fade-up when navigating between platform routes */
export function PageEntrance({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
