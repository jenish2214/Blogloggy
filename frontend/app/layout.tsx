import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import "@/styles/globals.css";

const ibmMono = IBM_Plex_Mono({
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-ibm-mono",
  display: "swap",
});

const ibmSans = IBM_Plex_Sans({
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-ibm-sans",
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
    <html lang="en" className={`${ibmMono.variable} ${ibmSans.variable}`}>
      <head>
        <meta name="color-scheme" content="dark" />
      </head>
      <body>
        <Navbar />
        <main style={{ paddingTop: "var(--navbar-h)" }}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
