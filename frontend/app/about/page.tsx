import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { bsjInfotech } from "@/config/company";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Blogloggy is built by BSJ Infotech — custom websites, SaaS apps, research platforms, and modern blogs for businesses worldwide.",
  openGraph: {
    title: "About Us · Blogloggy",
    description:
      "Learn about BSJ Infotech and the web platforms we design and build.",
  },
};

export default function AboutPage() {
  return (
    <PageShell
      badge="About"
      title="About Blogloggy"
      subtitle="A research and technology publication platform — designed, developed, and maintained by BSJ Infotech."
    >
      <div className="about-page">
        <ScrollReveal>
          <section className="about-hero-card">
            <p className="about-kicker">Built by</p>
            <h2 className="about-company-name">{bsjInfotech.name}</h2>
            <p className="about-lead">{bsjInfotech.tagline}</p>
            <p className="about-body">{bsjInfotech.description}</p>
          </section>
        </ScrollReveal>

        <ScrollReveal>
          <section className="about-section">
            <h2 className="about-section-title">What is Blogloggy?</h2>
            <p className="about-body">
              Blogloggy brings together research papers, university news, technology feeds, and
              curated articles in one fast, readable experience. It uses free public data sources,
              smart caching, and a polished interface so readers can explore science and tech
              without slow loads or broken pages.
            </p>
            <p className="about-body">
              This site is an example of the kind of{" "}
              <strong>content + data platform</strong> BSJ Infotech delivers for clients who need
              more than a static brochure site.
            </p>
          </section>
        </ScrollReveal>

        <ScrollReveal>
          <section className="about-section">
            <h2 className="about-section-title">We can build your website too</h2>
            <p className="about-body">
              Whether you need a site like Blogloggy or something entirely different — e-commerce,
              booking, internal tools, or a customer portal — {bsjInfotech.name} plans, designs, and
              ships full-stack web products.
            </p>
            <ul className="about-services">
              {bsjInfotech.services.map((s) => (
                <li key={s.title} className="about-service-card">
                  <h3>{s.title}</h3>
                  <p>{s.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        </ScrollReveal>

        <ScrollReveal>
          <section className="about-section">
            <h2 className="about-section-title">How we work</h2>
            <ul className="about-values">
              {bsjInfotech.values.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          </section>
        </ScrollReveal>

        <ScrollReveal>
          <section className="about-cta">
            <h2 className="about-section-title">Start your project</h2>
            <p className="about-body">
              Tell us what you want to launch — we&apos;ll propose architecture, timeline, and a
              stack that fits your budget (including free-tier friendly hosting when it makes sense).
            </p>
            <div className="about-cta-actions">
              <a href={`mailto:${bsjInfotech.email}`} className="btn btn-primary">
                Contact {bsjInfotech.name}
              </a>
              <Link href="/" className="btn btn-secondary">
                Explore Blogloggy
              </Link>
            </div>
            <p className="about-credit">
              © {new Date().getFullYear()} {bsjInfotech.name}. This website was made by{" "}
              <strong>{bsjInfotech.name}</strong>.
            </p>
          </section>
        </ScrollReveal>
      </div>
    </PageShell>
  );
}
