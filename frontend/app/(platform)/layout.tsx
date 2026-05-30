import { PlatformShell } from "@/components/layout/PlatformShell";
import "@/styles/platform-soft.css";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <PlatformShell>{children}</PlatformShell>;
}
