import type { DashboardKpi } from "@/lib/dashboard/dashboardData";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://quantdesk.app";

/** Static JSON-LD for crawlers — no user PII */
export function buildDashboardJsonLd(kpis: DashboardKpi[]) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "QuantDesk",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: SITE,
    description:
      "Paper trading platform with live market data, portfolio tracking, algo desk, and client wallet tools.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Paper trading with virtual capital",
    },
    featureList: kpis.map((k) => k.label),
  };
}
