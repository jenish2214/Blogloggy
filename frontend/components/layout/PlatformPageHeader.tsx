"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./PlatformPageHeader.module.css";

const TITLES: { prefix: string; title: string }[] = [
  { prefix: "/trade", title: "Trade" },
  { prefix: "/markets", title: "Markets" },
  { prefix: "/portfolio", title: "Portfolio" },
  { prefix: "/quant-lab", title: "Quant Lab" },
  { prefix: "/research", title: "Research" },
  { prefix: "/algo-trading", title: "Algo Desk" },
  { prefix: "/algo", title: "Algo Desk" },
  { prefix: "/screener", title: "Screener" },
  { prefix: "/desk", title: "Clients" },
  { prefix: "/wealth", title: "Wealth" },
  { prefix: "/forex-options", title: "Forex" },
  { prefix: "/forex", title: "Forex" },
  { prefix: "/risk", title: "Risk" },
  { prefix: "/profile", title: "Profile" },
  { prefix: "/orders", title: "Orders" },
];

function titleForPath(path: string) {
  if (path === "/") return "Dashboard";
  const match = TITLES.find((t) => t.prefix !== "/" && path.startsWith(t.prefix));
  return match?.title ?? "QuantDesk";
}

const QUICK = [
  { href: "/trade", label: "Trade" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/markets", label: "Markets" },
];

export function PlatformPageHeader() {
  const path = usePathname();
  const title = titleForPath(path);
  const isHome = path === "/";

  return (
    <div className={styles.bar}>
      <div className={styles.lead}>
        <h1 className={styles.title}>{title}</h1>
        {isHome && (
          <p className={styles.sub}>
            Paper trading · $100k virtual capital · Live market data
          </p>
        )}
      </div>
      {!isHome && (
        <nav className={styles.quick} aria-label="Quick links">
          {QUICK.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className={`${styles.quickLink} ${path.startsWith(q.href) ? styles.quickActive : ""}`}
            >
              {q.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
