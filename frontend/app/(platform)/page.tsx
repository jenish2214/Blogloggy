import type { Metadata } from "next";
import { DashboardPageClient } from "@/app/(platform)/DashboardPageClient";
import { DASHBOARD_KPIS } from "@/lib/dashboard/dashboardData";
import { buildDashboardJsonLd } from "@/lib/dashboard/structuredData";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://quantdesk.app";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "QuantDesk paper trading dashboard — live market data, portfolio KPIs, algo desk, client wallets, and research tools.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "QuantDesk Dashboard",
    description:
      "Paper trade stocks and crypto with $100k virtual capital. Live quotes, portfolio tracking, and quant workspaces.",
    url: siteUrl,
    siteName: "QuantDesk",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "QuantDesk Dashboard",
    description: "Paper trading dashboard with live market data and quant tools.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function HomePage() {
  const jsonLd = buildDashboardJsonLd(DASHBOARD_KPIS);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DashboardPageClient />
    </>
  );
}
