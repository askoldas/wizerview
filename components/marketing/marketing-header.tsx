"use client";

import Link from 'next/link';
import { Suspense, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/brand-logo';
import { AuthModal } from '@/components/auth/auth-modal';
import { createSupabaseClientInstance } from '@/lib/supabase';
import { customerLinks, productLinks } from './marketing-data';

function Dropdown({ label, links }: { label: string; links: Array<{ href: string; label: string }> }) {
  return (
    <div className="group relative">
      <button type="button" className="rounded-md px-3 py-2 text-sm font-semibold text-text-muted hover:bg-surface-muted hover:text-text">
        {label}
      </button>
      <div className="invisible absolute left-0 top-full z-30 w-64 translate-y-2 rounded-lg border border-border bg-surface p-2 opacity-0 shadow-md transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="block rounded-md px-3 py-2 text-sm font-semibold text-text-muted hover:bg-brand-soft hover:text-brand-strong">
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function MarketingHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createSupabaseClientInstance(), []);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const startFree = async () => {
    const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
    if (data.user) {
      router.push('/reviews/new');
      return;
    }
    router.push(`${pathname || '/'}?auth=signup&next=${encodeURIComponent('/reviews/new')}`);
  };

  const signIn = async () => {
    const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
    if (data.user) {
      router.push('/dashboard');
      return;
    }
    router.push(`${pathname || '/'}?auth=login&next=${encodeURIComponent('/dashboard')}`);
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <BrandLogo />

          <nav className="hidden items-center gap-1 md:flex">
            <Dropdown label="Product" links={productLinks} />
            <Dropdown label="Customers" links={customerLinks} />
            <Link href="/pricing" className="rounded-md px-3 py-2 text-sm font-semibold text-text-muted hover:bg-surface-muted hover:text-text">Pricing</Link>
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <button type="button" onClick={signIn} className="rounded-md px-3 py-2 text-sm font-semibold text-text-muted hover:bg-surface-muted">Sign in</button>
            <button type="button" onClick={startFree} className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong">Start free</button>
          </div>

          <button type="button" onClick={() => setIsMobileOpen((current) => !current)} className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-text md:hidden">
            Menu
          </button>
        </div>

        {isMobileOpen ? (
          <nav className="mx-auto mt-3 grid max-w-7xl gap-2 rounded-lg border border-border bg-surface-muted p-3 md:hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-subtle">Product</p>
            {productLinks.map((link) => <Link key={link.href} href={link.href} className="rounded-md px-3 py-2 text-sm font-semibold text-text-muted">{link.label}</Link>)}
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-text-subtle">Customers</p>
            {customerLinks.map((link) => <Link key={link.href} href={link.href} className="rounded-md px-3 py-2 text-sm font-semibold text-text-muted">{link.label}</Link>)}
            <Link href="/pricing" className="rounded-md px-3 py-2 text-sm font-semibold text-text-muted">Pricing</Link>
            <button type="button" onClick={signIn} className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-text-muted">Sign in</button>
            <button type="button" onClick={startFree} className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white">Start free</button>
          </nav>
        ) : null}
      </header>
      <Suspense fallback={null}>
        <AuthModal defaultNext="/reviews/new" />
      </Suspense>
    </>
  );
}
