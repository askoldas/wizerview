"use client";

import { useState } from 'react';
import { createSupabaseClientInstance } from '@/lib/supabase';

export function ClientAuthForm({ next = '/client' }: { next?: string }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const sendLink = async () => {
    const supabase = createSupabaseClientInstance();
    if (!supabase) return setMessage('Supabase is not configured.');
    setSending(true); setMessage(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next.startsWith('/') && !next.startsWith('//') ? next : '/client')}`;
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo, shouldCreateUser: true } });
    setMessage(error ? error.message : 'Check your email for a secure sign-in link.');
    setSending(false);
  };

  return <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10 text-text"><section className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-subtle">WizerView client portal</p><h1 className="mt-2 text-2xl font-semibold">Sign in to your projects</h1><p className="mt-2 text-sm leading-6 text-text-muted">We’ll send a passwordless link to your email. You stay signed in on this browser.</p><label className="mt-5 block text-sm font-semibold">Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" className="mt-2 h-11 w-full rounded-md border border-border px-3 font-normal" /></label><button type="button" disabled={sending || !email.trim()} onClick={() => void sendLink()} className="mt-4 w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{sending ? 'Sending…' : 'Email me a sign-in link'}</button>{message ? <p className="mt-3 text-sm text-text-muted" role="status">{message}</p> : null}</section></main>;
}
