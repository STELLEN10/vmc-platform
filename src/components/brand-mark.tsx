import Link from "next/link";

type BrandMarkProps = {
  compact?: boolean;
  href?: string;
};

export function BrandMark({ compact = false, href = "/" }: BrandMarkProps) {
  return (
    <Link href={href} className="brand-mark" aria-label="Valhalla Motorcycles home">
      <span className="brand-mark__crest" aria-hidden="true">V</span>
      {!compact && (
        <span className="brand-mark__wording">
          <span>VALHALLA</span>
          <small>MOTORCYCLES</small>
        </span>
      )}
    </Link>
  );
}
