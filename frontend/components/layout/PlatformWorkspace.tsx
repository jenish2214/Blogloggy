"use client";

import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { PlatformPageHeader } from "@/components/layout/PlatformPageHeader";
import { BookSwitcherGate } from "@/components/wealth/BookSwitcherGate";
import { GuestModeBanner } from "@/components/system/GuestModeBanner";
import { CloudSyncProvider } from "@/components/providers/CloudSyncProvider";
import styles from "./PlatformWorkspace.module.css";

export function PlatformWorkspace({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.workspace}>
      <MobileTopBar />
      <header className={styles.topStrip}>
        <PlatformPageHeader />
        <div className={styles.bookRow}>
          <BookSwitcherGate />
        </div>
      </header>
      <div className={styles.inner}>
        <GuestModeBanner />
        <CloudSyncProvider>{children}</CloudSyncProvider>
      </div>
    </div>
  );
}
