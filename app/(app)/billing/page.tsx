import type { Metadata } from 'next';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/app-shell/protected-route';
import { BrandLogo } from '@/components/brand-logo';

export const metadata: Metadata = {
  title: 'Billing — WizerView',
  robots: { index: false, follow: false },
};

export default function BillingPage() {
  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-canvas p-6 text-text">
        <BrandLogo href="/dashboard" />
        <section className="mt-8 rounded-lg border border-border bg-surface p-6">
          <h1 className="text-2xl font-semibold">Billing</h1>
          <p className="mt-2 text-sm text-text-muted">Billing and plan controls will connect here when paid plans are enabled.</p>
          <Link href="/dashboard" className="mt-4 inline-flex rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white">Back to dashboard</Link>
        </section>
      </main>
    </ProtectedRoute>
  );
}
