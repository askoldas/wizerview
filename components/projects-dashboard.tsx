"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createProject, listProjects, type ProjectSummary } from '@/lib/review-service';

export function ProjectsDashboard() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => { void listProjects().then(setProjects); }, []);
  const create = async () => { setIsCreating(true); const project = await createProject({ name, client }); setProjects((current) => [project, ...current]); setName(''); setClient(''); setIsCreating(false); };

  return <main className="min-h-screen bg-canvas px-4 py-6 text-text lg:px-8"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-subtle">WizerView</p><h1 className="mt-1 text-2xl font-semibold">Projects</h1></div><Link href="/dashboard" className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-text-muted">Dashboard</Link></header><section className="mt-5 rounded-lg border border-border bg-surface p-4"><p className="font-semibold">Create project</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Project name" className="rounded-md border border-border px-3 py-2 text-sm"/><input value={client} onChange={(event) => setClient(event.target.value)} placeholder="Client name" className="rounded-md border border-border px-3 py-2 text-sm"/><button type="button" disabled={isCreating} onClick={() => void create()} className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white">Create project</button></div></section><section className="mt-5 space-y-3">{projects.length ? projects.map((project) => <article key={project.id} className="rounded-lg border border-border bg-surface p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{project.name}</h2><p className="mt-1 text-sm text-text-muted">{project.client || 'No client'} · {project.reviews.length} reviews</p></div><Link href={`/projects/${project.id}`} className="rounded-md border border-border px-3 py-2 text-sm font-semibold">Open project</Link></div><div className="mt-3 space-y-2 border-t border-border pt-3">{project.reviews.length ? project.reviews.map((review) => <Link key={review.id} href={`/reviews/${review.id}`} className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-surface-muted"><span>{review.title}</span><span className="text-xs text-text-muted">{review.status} · {review.openComments} open</span></Link>) : <p className="text-sm text-text-muted">No reviews in this project yet.</p>}</div></article>) : <p className="rounded-lg border border-dashed border-border p-6 text-sm text-text-muted">No projects yet. Create a project to organize client reviews.</p>}</section></main>;
}
