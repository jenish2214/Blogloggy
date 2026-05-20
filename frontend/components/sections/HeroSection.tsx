"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const words = ["The", "World's", "Research,", "Distilled", "Daily"];

const wordVariants = {
  hidden: { opacity: 0, y: 28, filter: "blur(6px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay: 0.08 + i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

const pillVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.92 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: 0.85 + i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  }),
};

const quickLinks = [
  { href: "/news", label: "Tech news" },
  { href: "/research", label: "Research feed" },
  { href: "/topics", label: "Topics" },
  { href: "/universities", label: "Universities" },
  { href: "/categories", label: "Categories" },
  { href: "/digest", label: "Daily digest" },
];

export function HeroSection() {
  return (
    <section className="hero">
      <div className="hero-shapes" aria-hidden>
        <div className="hero-shape hero-shape-1 animate-float-1" />
        <div className="hero-shape hero-shape-2 animate-float-2" />
        <div className="hero-shape hero-shape-3 animate-float-3" />
        <div className="hero-glow animate-hero-glow" />
      </div>
      <div className="container hero-content">
        <motion.p
          className="hero-eyebrow"
          initial={{ opacity: 0, letterSpacing: "0.3em" }}
          animate={{ opacity: 1, letterSpacing: "0.12em" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          Academic research platform
        </motion.p>
        <h1 className="hero-title">
          {words.map((word, i) => (
            <motion.span
              key={word + i}
              className="hero-word"
              custom={i}
              variants={wordVariants}
              initial="hidden"
              animate="visible"
            >
              {word}
            </motion.span>
          ))}
        </h1>
        <motion.p
          className="hero-subtext"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
        >
          Curated papers, university news, and field guides — updated throughout the day.
        </motion.p>
        <motion.div
          className="hero-ctas"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.45 }}
        >
          <Link href="/research" className="btn btn-primary hero-cta-primary">
            Open research feed
          </Link>
          <Link href="/live" className="btn btn-secondary">
            Live feed →
          </Link>
        </motion.div>
        <div className="hero-quick-links">
          {quickLinks.map((link, i) => (
            <motion.div
              key={link.href}
              custom={i}
              variants={pillVariants}
              initial="hidden"
              animate="visible"
            >
              <Link href={link.href} className="hero-link-pill">
                {link.label}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
