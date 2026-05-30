"use client";

import { Suspense, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarProvider, useSidebar } from "@/components/layout/SidebarContext";
import { PlatformWorkspace } from "@/components/layout/PlatformWorkspace";
import { ToastProvider } from "@/components/shared/ToastProvider";

function ShellInner({ children }: { children: ReactNode }) {
  const { collapsed, mobileOpen, closeMobile } = useSidebar();

  return (
    <div
      className={`app-shell${collapsed ? " sidebar-collapsed" : ""}${mobileOpen ? " sidebar-mobile-open" : ""}`}
    >
      {mobileOpen ? (
        <button
          type="button"
          className="app-shell-backdrop"
          aria-label="Close navigation menu"
          onClick={closeMobile}
        />
      ) : null}
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      <PlatformWorkspace>{children}</PlatformWorkspace>
    </div>
  );
}

export function PlatformShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <SidebarProvider>
        <ShellInner>{children}</ShellInner>
      </SidebarProvider>
    </ToastProvider>
  );
}
