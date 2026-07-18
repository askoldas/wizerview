"use client";

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { inviteProjectClient, loadProjectClientAccess, revokeProjectClientAccess, type ProjectClientAccessRecord } from '@/lib/review-service';

export function ProjectSharingSettings({ projectId }: { projectId: string }) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [access, setAccess] = useState<ProjectClientAccessRecord[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const refreshAccess = useCallback(async () => {
    setIsLoading(true);
    try {
      setAccess(await loadProjectClientAccess(projectId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load client access.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void refreshAccess(); }, [refreshAccess]);

  const invite = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      await inviteProjectClient(projectId, inviteEmail);
      setInviteEmail('');
      setMessage('Invitation email sent. The client will join this Project after accepting it.');
      await refreshAccess();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not send the invitation.');
    } finally {
      setIsSaving(false);
    }
  };

  const revoke = async (record: ProjectClientAccessRecord) => {
    setIsSaving(true);
    setMessage(null);
    try {
      await revokeProjectClientAccess(record);
      setMessage(record.status === 'active' ? 'Client access removed.' : 'Invitation revoked.');
      await refreshAccess();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not change client access.');
    } finally {
      setIsSaving(false);
    }
  };

  return <main className="min-h-screen bg-canvas px-4 py-6 text-text lg:px-8"><header className="border-b border-border pb-5"><Link href="/dashboard" className="text-sm font-semibold text-text-muted">← Projects</Link><p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-text-subtle">Client access</p><h1 className="mt-2 text-3xl font-semibold">Invite clients to this Project</h1><p className="mt-2 max-w-xl text-sm leading-6 text-text-muted">Project access is account-based. Invite clients by email; they receive a secure passwordless sign-in link and use the client portal.</p></header><section className="mt-5 max-w-xl rounded-lg border border-border bg-surface p-4"><h2 className="font-semibold">Invite a client</h2><form onSubmit={(event) => { event.preventDefault(); void invite(); }} className="mt-3 flex gap-2"><input type="email" required value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="client@company.com" className="min-w-0 flex-1 rounded-md border border-border px-3 py-2 text-sm"/><button disabled={isSaving} className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Send invite</button></form>{message ? <p className="mt-3 text-sm text-text-muted" role="status">{message}</p> : null}</section><section className="mt-5 max-w-xl rounded-lg border border-border bg-surface p-4"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Client access</h2><p className="mt-1 text-sm text-text-muted">Active members can view this Project and its visible Reviews.</p></div><button type="button" onClick={() => void refreshAccess()} className="text-sm font-semibold text-brand">Refresh</button></div>{isLoading ? <p className="mt-4 text-sm text-text-muted">Loading access…</p> : access.length ? <ul className="mt-4 divide-y divide-border">{access.map((record) => <li key={record.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{record.displayName || record.email}</p><p className="mt-1 text-sm text-text-muted">{record.displayName ? record.email : null} · {record.status === 'active' ? 'Active client' : 'Invitation pending'}</p></div><button disabled={isSaving} type="button" onClick={() => void revoke(record)} className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-text-muted disabled:opacity-50">{record.status === 'active' ? 'Remove access' : 'Revoke invite'}</button></li>)}</ul> : <p className="mt-4 text-sm text-text-muted">No clients have access yet.</p>}</section></main>;
}
