import { Suspense } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { PlatformWorkspace } from "@/components/layout/PlatformWorkspace";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      <PlatformWorkspace>{children}</PlatformWorkspace>
    </div>
  );
}
