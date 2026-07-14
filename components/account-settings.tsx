"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createSupabaseClientInstance } from '@/lib/supabase';

export function AccountSettings() {
  const supabase = useMemo(() => createSupabaseClientInstance(), []);
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => { if (supabase) void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null)); }, [supabase]);
  return <div className="mt-6 space-y-4"><section className="rounded-md border border-border bg-surface-muted p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-subtle">Profile</p><p className="mt-2 text-sm text-text">{email ?? 'Loading account…'}</p><p className="mt-1 text-sm text-text-muted">This email is used to sign in and manage creator work.</p></section><section className="rounded-md border border-border p-4"><p className="font-semibold">Need help or account deletion?</p><p className="mt-1 text-sm text-text-muted">Contact support from the address on your account. We verify account-deletion requests before removing data.</p><Link href="/support" className="mt-3 inline-block text-sm font-semibold text-brand">Open support</Link></section></div>;
}
