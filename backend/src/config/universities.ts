import type { UniversityConfig } from "../types/index.js";

export const UNIVERSITIES: UniversityConfig[] = [
  {
    slug: "mit",
    name: "MIT",
    accentColor: "--color-accent-mit",
    description:
      "Massachusetts Institute of Technology — pioneering AI, robotics, and computational research.",
    sources: ["mit-rss", "arxiv", "semantic-scholar"],
    arxivQuery: "MIT",
    ssAffiliation: "Massachusetts Institute of Technology",
  },
  {
    slug: "harvard",
    name: "Harvard",
    accentColor: "--color-accent-hv",
    description:
      "Harvard University — interdisciplinary AI research across medicine, law, and sciences.",
    sources: ["harvard-rss", "pubmed", "semantic-scholar"],
    arxivQuery: "Harvard",
    ssAffiliation: "Harvard University",
  },
  {
    slug: "stanford",
    name: "Stanford",
    accentColor: "--color-accent-su",
    description:
      "Stanford University — leading machine learning, NLP, and human-centered AI.",
    sources: ["stanford-rss", "arxiv", "semantic-scholar"],
    arxivQuery: "Stanford",
    ssAffiliation: "Stanford University",
  },
  {
    slug: "oxford",
    name: "Oxford",
    accentColor: "--color-accent-ox",
    description: "University of Oxford — AI ethics, reasoning, and foundational ML theory.",
    sources: ["oxford-rss", "semantic-scholar"],
    arxivQuery: "Oxford",
    ssAffiliation: "University of Oxford",
  },
  {
    slug: "cambridge",
    name: "Cambridge",
    accentColor: "--color-accent-ox",
    description:
      "University of Cambridge — ML systems, language models, and scientific computing.",
    sources: ["cambridge-rss", "semantic-scholar"],
    arxivQuery: "Cambridge",
    ssAffiliation: "University of Cambridge",
  },
  {
    slug: "cmu",
    name: "CMU",
    accentColor: "--color-accent-mit",
    description:
      "Carnegie Mellon University — robotics, NLP, and AI systems research.",
    sources: ["arxiv", "semantic-scholar"],
    arxivQuery: "Carnegie Mellon",
    ssAffiliation: "Carnegie Mellon University",
  },
  {
    slug: "berkeley",
    name: "UC Berkeley",
    accentColor: "--color-accent-ai",
    description:
      "UC Berkeley — deep learning, alignment, and large-scale ML infrastructure.",
    sources: ["arxiv", "semantic-scholar"],
    arxivQuery: "Berkeley OR UC Berkeley",
    ssAffiliation: "University of California Berkeley",
  },
  {
    slug: "deepmind",
    name: "DeepMind",
    accentColor: "--color-accent-open",
    description:
      "Google DeepMind — frontier AI research in reinforcement learning and protein folding.",
    sources: ["deepmind-rss", "arxiv", "semantic-scholar"],
    arxivQuery: "DeepMind",
    ssAffiliation: "DeepMind",
  },
];

export function getUniversity(slug: string): UniversityConfig | undefined {
  return UNIVERSITIES.find((u) => u.slug === slug);
}
