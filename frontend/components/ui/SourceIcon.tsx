import { sourceAvatarLetter, sourceColor } from "@/lib/news";

type SourceIconProps = {
  logoKey: string;
  size?: number;
  className?: string;
};

/** Letter + color badge for feed sources — no SVG images */
export function SourceIcon({ logoKey, size = 40, className = "" }: SourceIconProps) {
  const color = sourceColor(logoKey);
  const letter = sourceAvatarLetter(logoKey);

  return (
    <span
      className={`source-avatar ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(12, size * 0.38),
        background: `${color}18`,
        color,
        borderColor: `${color}55`,
      }}
      aria-hidden
    >
      {letter}
    </span>
  );
}
