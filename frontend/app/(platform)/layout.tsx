import { Sidebar } from "@/components/layout/Sidebar";
import { CloudSyncProvider } from "@/components/providers/CloudSyncProvider";
import { BookSwitcherGate } from "@/components/wealth/BookSwitcherGate";
import { GuestModeBanner } from "@/components/system/GuestModeBanner";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <BookSwitcherGate />
        <GuestModeBanner />
        <CloudSyncProvider>{children}</CloudSyncProvider>
      </main>
    </div>
  );
}
