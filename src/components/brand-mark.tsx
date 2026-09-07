import Image from "next/image";
import Link from "next/link";

type BrandMarkProps = {
  compact?: boolean;
  href?: string;
};

export function BrandMark({ compact = false, href = "/" }: BrandMarkProps) {
  return (
    <Link href={href} className="brand-mark" aria-label="Valhalla Motorcycles home">
      <Image
        alt="Valhalla Motorcycles"
        className={compact ? "brand-mark__logo brand-mark__logo--compact" : "brand-mark__logo"}
        height={400}
        priority
        src="/vmc-logo.png"
        width={500}
      />
    </Link>
  );
}
