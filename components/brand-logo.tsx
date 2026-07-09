import Image from 'next/image';
import Link from 'next/link';

interface BrandLogoProps {
  className?: string;
  href?: string;
}

export function BrandLogo({ className = '', href = '/' }: BrandLogoProps) {
  return (
    <Link href={href} className={`flex items-center ${className}`} aria-label="WizerView home">
      <Image
        src="/wizerview_logo.svg"
        alt="WizerView"
        width={254}
        height={45}
        priority
        unoptimized
        className="h-7 w-auto"
      />
    </Link>
  );
}
