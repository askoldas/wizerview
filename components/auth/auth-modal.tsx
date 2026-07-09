"use client";

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseClientInstance } from '@/lib/supabase';

type AuthMode = 'login' | 'signup';

interface AuthModalProps {
  embeddedMode?: AuthMode;
  defaultNext?: string;
}

function authTitle(mode: AuthMode) {
  return mode === 'signup' ? 'Start your free review' : 'Sign in to WizerView';
}

function authAction(mode: AuthMode) {
  return mode === 'signup' ? 'Send signup link' : 'Send sign-in link';
}

export function AuthModal({ embeddedMode, defaultNext = '/dashboard' }: AuthModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseClientInstance(), []);
  const queryMode = searchParams.get('auth');
  const mode = embeddedMode ?? (queryMode === 'signup' ? 'signup' : 'login');
  const isOpen = Boolean(embeddedMode || queryMode === 'signup' || queryMode === 'login');
  const next = searchParams.get('next') || defaultNext;
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && isOpen) router.push(next || '/dashboard');
    });

    return () => listener.subscription.unsubscribe();
  }, [isOpen, next, router, supabase]);

  if (!isOpen) return null;

  const close = () => {
    if (embeddedMode) return;
    router.push(pathname || '/');
  };

  const sendLink = async () => {
    if (!supabase) {
      setMessage('Add Supabase environment variables before signing in.');
      return;
    }

    setIsSending(true);
    setMessage(null);

    const redirectPath = next || '/dashboard';
    const emailRedirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}/login?next=${encodeURIComponent(redirectPath)}`
      : undefined;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo,
        shouldCreateUser: mode === 'signup',
      },
    });

    setMessage(error ? error.message : 'Check your email for the secure access link.');
    setIsSending(false);
  };

  return (
    <div className={embeddedMode ? '' : 'fixed inset-0 z-50 flex items-center justify-center bg-text/60 px-4'}>
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-subtle">WizerView</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text">{authTitle(mode)}</h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">Use your email to receive a secure magic link. No password needed for the MVP.</p>
          </div>
          {!embeddedMode ? (
            <button type="button" onClick={close} className="rounded-md px-2 py-1 text-sm font-semibold text-text-subtle hover:bg-surface-muted" aria-label="Close auth modal">
              X
            </button>
          ) : null}
        </div>

        <label className="mt-5 block text-sm font-semibold text-text" htmlFor="auth-email">Email</label>
        <input
          id="auth-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="mt-2 h-11 w-full rounded-md border border-border bg-surface px-3 text-sm"
        />
        <button
          type="button"
          onClick={sendLink}
          disabled={isSending || !email}
          className="mt-4 w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending ? 'Sending...' : authAction(mode)}
        </button>
        {message ? <p className="mt-3 text-sm leading-6 text-text-muted">{message}</p> : null}
      </div>
    </div>
  );
}
