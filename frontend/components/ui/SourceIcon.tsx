import Image from "next/image";
import { BrandIcon } from "@/components/ui/BrandIcon";

const SVG_ICONS: Record<string, string> = {
  google: "/icons/google-g.svg",
  blogger: "/icons/blogger-logo.svg",
  blogloggy: "/icons/blogger-logo.svg",
};

type SourceIconProps = {
  logoKey: string;
  size?: number;
  className?: string;
};

/** Round SVG badge for feeds (Google G, Blogger b, etc.) */
export function SourceIcon({ logoKey, size = 20, className = "" }: SourceIconProps) {
  const key = logoKey.toLowerCase();
  const src = SVG_ICONS[key];

  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        className={`source-icon-img ${className}`}
        aria-hidden
      />
    );
  }

  if (key === "anthropic" || key === "openai") {
    return (
      <span
        className={`source-icon-fallback ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.45 }}
        aria-hidden
      >
        {key === "anthropic" ? "A" : "O"}
      </span>
    );
  }

  return <BrandIcon size={size} className={className} />;
}
