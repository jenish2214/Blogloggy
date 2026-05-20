export interface ResearchCategory {
  slug: string;
  name: string;
  description: string;
  arxivQuery: string;
  semanticQuery: string;
  icon: string;
}

export const CATEGORIES: ResearchCategory[] = [
  {
    slug: "ai-ml",
    name: "AI & Machine Learning",
    description: "Latest papers in artificial intelligence, deep learning, and neural networks.",
    arxivQuery: "cat:cs.AI OR cat:cs.LG OR cat:cs.NE",
    semanticQuery: "artificial intelligence machine learning",
    icon: "brain",
  },
  {
    slug: "nlp",
    name: "Natural Language Processing",
    description: "Language models, transformers, and computational linguistics research.",
    arxivQuery: "cat:cs.CL",
    semanticQuery: "natural language processing transformers",
    icon: "message",
  },
  {
    slug: "systems",
    name: "Systems & Infrastructure",
    description: "Distributed systems, operating systems, and ML infrastructure.",
    arxivQuery: "cat:cs.DC OR cat:cs.OS",
    semanticQuery: "distributed systems machine learning infrastructure",
    icon: "server",
  },
  {
    slug: "math",
    name: "Mathematics & Statistics",
    description: "Statistical theory, probability, and mathematical foundations of ML.",
    arxivQuery: "cat:math.ST OR cat:math.PR",
    semanticQuery: "statistics probability machine learning theory",
    icon: "sigma",
  },
  {
    slug: "physics",
    name: "Applied Physics",
    description: "Physics applications including quantum and computational methods.",
    arxivQuery: "cat:physics.app-ph",
    semanticQuery: "applied physics computational methods",
    icon: "atom",
  },
  {
    slug: "biomedical",
    name: "Biomedical & Health",
    description: "AI in medicine, neuroscience, and health sciences from PubMed.",
    arxivQuery: "cat:q-bio.NC OR cat:cs.AI",
    semanticQuery: "artificial intelligence medical research",
    icon: "heart",
  },
  {
    slug: "robotics",
    name: "Robotics & Vision",
    description: "Computer vision, robotics, and embodied AI research.",
    arxivQuery: "cat:cs.RO OR cat:cs.CV",
    semanticQuery: "robotics computer vision deep learning",
    icon: "eye",
  },
  {
    slug: "universities",
    name: "University Research",
    description: "Papers and news from MIT, Harvard, Stanford, Oxford, and more.",
    arxivQuery: "cat:cs.AI AND (Harvard OR MIT OR Stanford OR CMU OR Berkeley)",
    semanticQuery: "university artificial intelligence research",
    icon: "graduation",
  },
];

export function getCategory(slug: string): ResearchCategory | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

const ARXIV_TERM_TO_SLUG: Record<string, string> = {
  "cs.AI": "ai-ml",
  "cs.LG": "ai-ml",
  "cs.NE": "ai-ml",
  "cs.CL": "nlp",
  "cs.DC": "systems",
  "cs.OS": "systems",
  "math.ST": "math",
  "math.PR": "math",
  "physics.app-ph": "physics",
  "q-bio.NC": "biomedical",
  "cs.RO": "robotics",
  "cs.CV": "robotics",
};

export function inferCategorySlug(paper: {
  category?: string;
  categories?: string[];
}): string | undefined {
  if (paper.category && getCategory(paper.category)) return paper.category;
  for (const term of paper.categories ?? []) {
    const slug = ARXIV_TERM_TO_SLUG[term];
    if (slug && getCategory(slug)) return slug;
  }
  return undefined;
}
