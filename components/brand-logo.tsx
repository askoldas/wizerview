import Image from 'next/image';
import Link from 'next/link';

interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className = '' }: BrandLogoProps) {
  return (
    <Link href="/" className={`flex items-center ${className}`} aria-label="WizerView home">
      <Image
        src="/wizerview_logo.svg"
        alt="WizerView"
        width={254}
        height={45}
        priority
        unoptimized
        className="h-8 w-auto"
      />
    </Link>
  );
}
