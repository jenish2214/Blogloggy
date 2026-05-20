import Link from "next/link";
import { BrandIcon } from "@/components/ui/BrandIcon";
import { bsjInfotech } from "@/config/company";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <p className="footer-brand">
            <BrandIcon size={28} className="footer-brand-icon" title="Blogloggy" />
            <span>Blogloggy</span>
          </p>
          <p className="footer-tagline">
            Discover research papers, blogs, and articles from top universities worldwide.
          </p>
          <p className="footer-built-by">
            Website designed &amp; developed by{" "}
            <Link href="/about">{bsjInfotech.name}</Link>
          </p>
        </div>
        <nav className="footer-nav" aria-label="Footer">
          <Link href="/news">News</Link>
          <Link href="/research">Research Feed</Link>
          <Link href="/topics">Topics</Link>
          <Link href="/authors">Researchers</Link>
          <Link href="/categories">Categories</Link>
          <Link href="/universities">Universities</Link>
          <Link href="/live">Live Feed</Link>
          <Link href="/digest">Digest</Link>
          <Link href="/about">About Us</Link>
        </nav>
        <p className="footer-copy">
          © {new Date().getFullYear()} Blogloggy · Made by {bsjInfotech.name}
        </p>
      </div>
    </footer>
  );
}
