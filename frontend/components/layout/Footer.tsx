import Link from "next/link";
import { BrandIcon } from "@/components/ui/BrandIcon";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <p className="footer-brand">
            <BrandIcon size={28} className="footer-brand-icon" title="Blogloggy" />
            <span>Research Digest</span>
          </p>
          <p className="footer-tagline">
            Discover research papers, blogs, and articles from top universities worldwide.
          </p>
        </div>
        <nav className="footer-nav">
          <Link href="/news">News</Link>
          <Link href="/research">Research Feed</Link>
          <Link href="/topics">Topics</Link>
          <Link href="/authors">Researchers</Link>
          <Link href="/categories">Categories</Link>
          <Link href="/universities">Universities</Link>
          <Link href="/live">Live Feed</Link>
          <Link href="/digest">Digest</Link>
        </nav>
        <p className="footer-copy">
          © {new Date().getFullYear()} Research Digest
        </p>
      </div>
    </footer>
  );
}
