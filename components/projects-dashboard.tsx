"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createProject, listProjects, listReviews, type ProjectSummary, type ReviewSummary } from '@/lib/review-service';

export function ProjectsDashboard() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [standaloneReviews, setStandaloneReviews] = useState<ReviewSummary[]>([]);
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([listProjects(), listReviews()]).then(([loadedProjects, loadedReviews]) => {
      setProjects(loadedProjects);
      setStandaloneReviews(loadedReviews.filter((review) => !review.projectId));
    });
  }, []);
  const create = async () => { setIsCreating(true); const project = await createProject({ name, client, description }); setProjects((current) => [project, ...current]); setName(''); setClient(''); setDescription(''); setIsCreating(false); };
  const shareProject = async (project: ProjectSummary) => {
    if (!project.shareToken) return;
    await navigator.clipboard?.writeText(`${window.location.origin}/project/${project.shareToken}`);
    setShareMessage(`Shared project link copied for ${project.name}.`);
  };

  return <main className="min-h-screen bg-canvas px-4 py-6 text-text lg:px-8"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-subtle">WizerView</p><h1 className="mt-1 text-2xl font-semibold">Projects</h1><p className="mt-1 text-sm text-text-muted">Client engagements and their focused reviews.</p></div></header><section className="mt-5 rounded-lg border border-border bg-surface p-4"><p className="font-semibold">Create project</p><div className="mt-3 grid gap-2 sm:grid-cols-3"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Project name" className="rounded-md border border-border px-3 py-2 text-sm"/><input value={client} onChange={(event) => setClient(event.target.value)} placeholder="Client name" className="rounded-md border border-border px-3 py-2 text-sm"/><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional description" className="rounded-md border border-border px-3 py-2 text-sm"/></div><button type="button" disabled={isCreating} onClick={() => void create()} className="mt-2 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white">Create project</button></section>{shareMessage ? <p className="mt-3 text-sm text-text-muted" role="status">{shareMessage}</p> : null}<section className="mt-5 space-y-3">{projects.length ? projects.map((project) => { const attention = project.reviews.filter((review) => review.openComments > 0 || review.status === 'Changes Requested').length; return <article key={project.id} className="rounded-lg border border-border bg-surface p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{project.name}</h2><p className="mt-1 text-sm text-text-muted">{project.client || 'No client'} · {project.reviews.length} reviews{attention ? ` · ${attention} need attention` : ''}</p></div><div className="flex flex-wrap gap-2"><Link href={`/reviews/new?projectId=${project.id}`} className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white">Add review</Link><button type="button" onClick={() => void shareProject(project)} disabled={!project.shareToken} className="rounded-md border border-border px-3 py-2 text-sm font-semibold disabled:opacity-50">Share project</button></div></div><div className="mt-3 space-y-2 border-t border-border pt-3">{project.reviews.length ? project.reviews.map((review) => <Link key={review.id} href={`/reviews/${review.id}`} className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-surface-muted"><span>{review.title}</span><span className="text-xs text-text-muted">{review.status} · {review.openComments} open</span></Link>) : <p className="text-sm text-text-muted">No reviews in this project yet.</p>}</div></article>; }) : <p className="rounded-lg border border-dashed border-border p-6 text-sm text-text-muted">No projects yet. Create a project to organize client reviews.</p>}</section>{standaloneReviews.length ? <section className="mt-5 rounded-lg border border-border bg-surface p-4"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Standalone reviews</h2><p className="mt-1 text-sm text-text-muted">Reviews that are not assigned to a project.</p></div><Link href="/reviews/new" className="rounded-md border border-border px-3 py-2 text-sm font-semibold">New review</Link></div><div className="mt-3 space-y-2 border-t border-border pt-3">{standaloneReviews.map((review) => <Link key={review.id} href={`/reviews/${review.id}`} className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-surface-muted"><span>{review.title}</span><span className="text-xs text-text-muted">{review.status} · {review.openComments} open</span></Link>)}</div></section> : null}</main>;
}
