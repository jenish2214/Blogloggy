import { BLOGGER_LOGO_PATH, BRAND_ORANGE } from "@/lib/brand";

type BrandIconProps = {
  size?: number;
  className?: string;
  title?: string;
};

export function BrandIcon({ size = 32, className = "", title }: BrandIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      role={title ? "img" : "presentation"}
      aria-hidden={!title}
    >
      {title ? <title>{title}</title> : null}
      <rect width="32" height="32" rx="7.5" fill={BRAND_ORANGE} />
      <path fill="#FFFFFF" fillRule="evenodd" d={BLOGGER_LOGO_PATH} />
    </svg>
  );
}
