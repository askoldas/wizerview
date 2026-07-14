"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
  return mode === 'signup' ? 'Create account' : 'Sign in';
}

export function AuthModal({ embeddedMode, defaultNext = '/dashboard' }: AuthModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseClientInstance(), []);
  const queryMode = searchParams.get('auth');
  const requestedMode = embeddedMode ?? (queryMode === 'signup' ? 'signup' : 'login');
  const isOpen = Boolean(embeddedMode || queryMode === 'signup' || queryMode === 'login');
  const next = searchParams.get('next') || defaultNext;
  const [mode, setMode] = useState<AuthMode>(requestedMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    setMode(requestedMode);
    setMessage(null);
  }, [requestedMode, isOpen]);

  useEffect(() => {
    if (!supabase || !isOpen) return;

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) router.push(next || '/dashboard');
    });

    return () => listener.subscription.unsubscribe();
  }, [isOpen, next, router, supabase]);

  if (!isOpen) return null;

  const close = () => {
    if (embeddedMode) return;
    router.push(pathname || '/');
  };

  const handleEmailAuth = async () => {
    if (!supabase) {
      setMessage('Add Supabase environment variables before signing in.');
      return;
    }

    setIsSending(true);
    setMessage(null);

    const { data, error } = mode === 'signup'
      ? await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login?next=${encodeURIComponent(next || '/dashboard')}` : undefined,
          },
        })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(error.message);
    } else if (data.session) {
      router.push(next || '/dashboard');
    } else if (mode === 'signup') {
      setMessage('Account created. If email confirmation is enabled in Supabase, confirm it before signing in.');
    } else {
      router.push(next || '/dashboard');
    }

    setIsSending(false);
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setMessage(null);

    if (!embeddedMode) {
      router.push(`${pathname || '/'}?auth=${nextMode}&next=${encodeURIComponent(next || defaultNext)}`);
    }
  };

  return (
    <div className={embeddedMode ? '' : 'fixed inset-0 z-50 flex items-center justify-center bg-text/60 px-4 py-6'}>
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-subtle">WizerView</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text">{authTitle(mode)}</h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">Use email and password to manage reviews and uploads.</p>
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
        <label className="mt-4 block text-sm font-semibold text-text" htmlFor="auth-password">Password</label>
        <input
          id="auth-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Minimum 6 characters"
          className="mt-2 h-11 w-full rounded-md border border-border bg-surface px-3 text-sm"
        />
        <button
          type="button"
          onClick={handleEmailAuth}
          disabled={isSending || !email || password.length < 6}
          className="mt-4 w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending ? 'Sending...' : authAction(mode)}
        </button>
        {message ? <p className="mt-3 text-sm leading-6 text-text-muted">{message}</p> : null}
        {mode === 'login' ? <p className="mt-3 text-right text-sm"><Link href="/reset-password" className="font-semibold text-brand hover:text-brand-strong">Forgot password?</Link></p> : null}
        <p className="mt-4 text-center text-sm text-text-muted">
          {mode === 'signup' ? 'Already have an account?' : 'New to WizerView?'}{' '}
          <button type="button" onClick={() => switchMode(mode === 'signup' ? 'login' : 'signup')} className="font-semibold text-brand hover:text-brand-strong">
            {mode === 'signup' ? 'Sign in' : 'Create account'}
          </button>
        </p>
      </div>
    </div>
  );
}
