import type { Metadata } from "next";
import { QuantLabDashboard } from "@/components/quant-lab/QuantLabDashboard";

export const metadata: Metadata = {
  title: "Quant Lab",
};

export default function QuantLabPage() {
  return <QuantLabDashboard />;
}
