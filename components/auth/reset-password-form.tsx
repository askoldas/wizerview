"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createSupabaseClientInstance } from '@/lib/supabase';

export function ResetPasswordForm() {
  const supabase = useMemo(() => createSupabaseClientInstance(), []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRecovery, setIsRecovery] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { if (supabase) void supabase.auth.getUser().then(({ data }) => setIsRecovery(Boolean(data.user))); }, [supabase]);

  const submit = async () => {
    if (!supabase) { setMessage('Add Supabase environment variables before continuing.'); return; }
    setIsSaving(true); setMessage(null);
    if (isRecovery) {
      const { error } = await supabase.auth.updateUser({ password });
      setMessage(error ? error.message : 'Password updated. You can now return to your dashboard.');
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: typeof window === 'undefined' ? undefined : `${window.location.origin}/reset-password` });
      setMessage(error ? error.message : 'Check your email for a secure password-reset link.');
    }
    setIsSaving(false);
  };

  return <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10"><section className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-subtle">WizerView account</p><h1 className="mt-2 text-2xl font-semibold">{isRecovery ? 'Choose a new password' : 'Reset your password'}</h1><p className="mt-2 text-sm leading-6 text-text-muted">{isRecovery ? 'Use at least six characters.' : 'We will send a reset link to your email address.'}</p>{isRecovery ? <label className="mt-5 block text-sm font-semibold">New password<input autoFocus type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-md border border-border px-3 py-2 font-normal" /></label> : <label className="mt-5 block text-sm font-semibold">Email<input autoFocus type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-md border border-border px-3 py-2 font-normal" placeholder="you@example.com" /></label>}<button type="button" onClick={() => void submit()} disabled={isSaving || (isRecovery ? password.length < 6 : !email)} className="mt-5 w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{isSaving ? 'Saving…' : isRecovery ? 'Update password' : 'Send reset link'}</button>{message ? <p className="mt-3 text-sm text-text-muted" role="status">{message}</p> : null}<Link href="/login" className="mt-5 inline-block text-sm font-semibold text-brand">Back to sign in</Link></section></main>;
}
