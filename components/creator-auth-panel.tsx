"use client";

import { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createSupabaseClientInstance } from '@/lib/supabase';

export function CreatorAuthPanel() {
  const supabase = useMemo(() => createSupabaseClientInstance(), []);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [message, setMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    let ignored = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!ignored) setUser(data.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      ignored = true;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const authenticate = async () => {
    if (!supabase) {
      setMessage('Add Supabase environment variables before signing in.');
      return;
    }

    setIsSending(true);
    setMessage(null);

    const { data, error } = mode === 'signup'
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(error.message);
    } else if (mode === 'signup' && !data.session) {
      setMessage('Account created. If email confirmation is enabled in Supabase, confirm it before signing in.');
    } else {
      setMessage(null);
    }

    setIsSending(false);
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setMessage(null);
  };

  if (user) {
    return (
      <div className="rounded-[14px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
        <p className="font-semibold">Signed in</p>
        <p className="mt-1 break-words text-emerald-800">{user.email}</p>
        <button type="button" onClick={signOut} className="mt-3 rounded-[10px] bg-white px-3 py-2 text-sm font-semibold text-emerald-950 shadow-sm hover:bg-emerald-100">
          Log out
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-[14px] border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-stone-950">{mode === 'signup' ? 'Create account' : 'Creator login'}</p>
      <p className="mt-1 text-sm leading-5 text-stone-600">Sign in to create reviews, save changes, and upload optimized previews.</p>
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        className="mt-3 w-full rounded-[10px] border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm"
      />
      <input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Password"
        className="mt-2 w-full rounded-[10px] border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm"
      />
      <button type="button" onClick={authenticate} disabled={isSending || !email || password.length < 6} className="mt-2 w-full rounded-[10px] bg-stone-950 px-3 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60">
        {isSending ? 'Working...' : mode === 'signup' ? 'Create account' : 'Sign in'}
      </button>
      <button type="button" onClick={() => setMode((current) => current === 'signup' ? 'login' : 'signup')} className="mt-2 w-full rounded-[10px] border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">
        {mode === 'signup' ? 'Sign in instead' : 'Create account instead'}
      </button>
      {message ? <p className="mt-2 text-sm text-stone-600">{message}</p> : null}
    </div>
  );
}
