import { HeroSection } from "@/components/sections/HeroSection";
import { FeaturedPapersSection } from "@/components/sections/FeaturedPapersSection";
import { CategoriesSection } from "@/components/sections/CategoriesSection";
import { UniversitySection } from "@/components/sections/UniversitySection";
import { AIDigestSection } from "@/components/sections/AIDigestSection";
import { LiveFeedSection } from "@/components/sections/LiveFeedSection";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturedPapersSection />
      <CategoriesSection />
      <UniversitySection />
      <AIDigestSection />
      <LiveFeedSection />
    </>
  );
}
