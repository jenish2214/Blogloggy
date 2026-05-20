"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandIcon } from "@/components/ui/BrandIcon";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/news", label: "News" },
  { href: "/research", label: "Papers" },
  { href: "/topics", label: "Topics" },
  { href: "/authors", label: "Researchers" },
  { href: "/categories", label: "Categories" },
  { href: "/universities", label: "Universities" },
  { href: "/live", label: "Live" },
  { href: "/digest", label: "Digest" },
  { href: "/about", label: "About" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`navbar ${scrolled ? "navbar-scrolled" : ""}`}>
      <div className="container navbar-inner">
        <Link href="/" className="navbar-logo">
          <BrandIcon size={34} className="navbar-logo-icon" title="Blogloggy" />
          <span className="navbar-logo-text">Blogloggy</span>
        </Link>
        <nav className={`navbar-nav ${menuOpen ? "open" : ""}`} aria-label="Main">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="navbar-right">
          <button
            type="button"
            className={`navbar-toggle ${menuOpen ? "open" : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}
