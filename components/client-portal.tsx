"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createSupabaseClientInstance } from '@/lib/supabase';

export interface ClientPortalProject { id: string; name: string; description: string; clientName: string; }

export function ClientPortal({ email, initialDisplayName, projects }: { email: string; initialDisplayName: string; projects: ClientPortalProject[] }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [message, setMessage] = useState<string | null>(null);

  const saveName = async () => {
    const supabase = createSupabaseClientInstance();
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ display_name: displayName.trim() }).eq('user_id', user.id);
    setMessage(error ? error.message : 'Display name saved.');
  };
  const signOut = async () => { const supabase = createSupabaseClientInstance(); await supabase?.auth.signOut(); router.replace('/client/sign-in'); router.refresh(); };

  return <main className="min-h-screen bg-canvas px-4 py-6 text-text lg:px-8"><header className="flex flex-wrap items-start justify-between gap-5 border-b border-border pb-5"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-subtle">WizerView</p><h1 className="mt-2 text-3xl font-semibold">Your Projects</h1><p className="mt-2 text-sm text-text-muted">Reviews, requests, and progress shared with you.</p></div><details className="min-w-56 rounded-md border border-border bg-surface p-3 text-sm"><summary className="cursor-pointer font-semibold">{displayName || email}</summary><p className="mt-2 break-all text-text-muted">{email}</p><label className="mt-3 block font-semibold">Display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-1 w-full rounded-md border border-border px-2 py-1.5 font-normal" /></label><button type="button" onClick={() => void saveName()} className="mt-2 text-sm font-semibold text-brand">Save name</button><button type="button" onClick={() => void signOut()} className="ml-4 text-sm font-semibold text-text-muted">Sign out</button>{message ? <p className="mt-2 text-xs text-text-muted">{message}</p> : null}</details></header><section className="mt-6 space-y-3">{projects.length ? projects.map((project) => <Link key={project.id} href={`/client/projects/${project.id}`} className="block rounded-lg border border-border bg-surface p-4 transition hover:bg-surface-muted"><h2 className="font-semibold">{project.name}</h2>{project.clientName ? <p className="mt-1 text-sm text-text-muted">{project.clientName}</p> : null}{project.description ? <p className="mt-2 text-sm leading-6 text-text-muted">{project.description}</p> : null}</Link>) : <section className="rounded-lg border border-dashed border-border p-6 text-sm text-text-muted">You don’t have any active client Projects yet. Ask the creator to send an invitation to this email address.</section>}</section></main>;
}
