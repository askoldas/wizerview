import { Suspense } from 'react';
import { BrandLogo } from '@/components/brand-logo';
import { AuthModal } from './auth-modal';

export function AuthFallbackPage({ mode }: { mode: 'login' | 'signup' }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandLogo />
        </div>
        <Suspense fallback={<div className="rounded-lg border border-border bg-surface p-6 text-sm text-text-muted">Loading...</div>}>
          <AuthModal embeddedMode={mode} />
        </Suspense>
      </div>
    </main>
  );
}
