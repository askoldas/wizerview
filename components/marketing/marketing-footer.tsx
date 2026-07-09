import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import { customerLinks, productLinks } from './marketing-data';

const companyLinks = [
  { href: 'mailto:hello@wizerview.app', label: 'Contact' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];

export function MarketingFooter() {
  const tools = productLinks.filter((link) => link.href.includes('tool'));

  return (
    <footer className="border-t border-border bg-surface px-4 py-10 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <BrandLogo />
          <p className="mt-4 max-w-sm text-sm leading-6 text-text-muted">Visual client feedback and approval for designs, website screenshots, images and PDFs.</p>
        </div>
        <FooterGroup title="Product" links={productLinks.filter((link) => link.href === '/features' || link.href === '/pricing')} />
        <FooterGroup title="Tools" links={tools} />
        <FooterGroup title="Customers" links={customerLinks} />
        <FooterGroup title="Company" links={companyLinks} />
      </div>
    </footer>
  );
}

function FooterGroup({ title, links }: { title: string; links: Array<{ href: string; label: string }> }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-text">{title}</h2>
      <div className="mt-3 grid gap-2">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="text-sm text-text-muted hover:text-brand">
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
