import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { ConfigBanner } from "@/components/system/ConfigBanner";
import "@/styles/globals.css";

const jakarta = Plus_Jakarta_Sans({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "QuantDesk",
  title: {
    default: "QuantDesk — Paper Trading Platform",
    template: "%s · QuantDesk",
  },
  description:
    "Professional paper trading platform. Trade stocks, options, and crypto with virtual capital. Real-time market data powered by free APIs.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${jetbrains.variable}`}>
      <body>
        <ConfigBanner />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
