"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createProject, getActiveWorkUsage, getProjectShareToken, listProjectRequests, listProjects, listReviews, type ProjectRequestSummary, type ProjectSummary, type ReviewSummary } from '@/lib/review-service';
import type { ActiveWorkUsage } from '@/lib/domain';

export function ProjectsDashboard() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [standaloneReviews, setStandaloneReviews] = useState<ReviewSummary[]>([]);
  const [requests, setRequests] = useState<ProjectRequestSummary[]>([]);
  const [usage, setUsage] = useState<ActiveWorkUsage | null>(null);
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([listProjects(), listReviews(), listProjectRequests(), getActiveWorkUsage()])
      .then(([loadedProjects, loadedReviews, loadedRequests, loadedUsage]) => {
        setProjects(loadedProjects);
        setStandaloneReviews(loadedReviews.filter((review) => !review.projectId));
        setRequests(loadedRequests);
        setUsage(loadedUsage);
      })
      .catch((error) => setNotice(error instanceof Error ? error.message : 'Could not load workspace data. Refresh and try again.'));
  }, []);

  const create = async () => {
    setIsCreating(true);
    setNotice(null);
    try {
      const project = await createProject({ name, client, description });
      setProjects((current) => [project, ...current]);
      setName('');
      setClient('');
      setDescription('');
      setUsage(await getActiveWorkUsage());
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not create project.');
    } finally {
      setIsCreating(false);
    }
  };

  const shareProject = async (project: ProjectSummary) => {
    try {
      const shareToken = await getProjectShareToken(project.id);
      await navigator.clipboard?.writeText(`${window.location.origin}/project/${shareToken}`);
      setProjects((current) => current.map((item) => item.id === project.id ? { ...item, shareToken } : item));
      setNotice(`Shared project link copied for ${project.name}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not prepare the project link.');
    }
  };

  const usageLabel = !usage
    ? null
    : usage.limit === null
      ? `${usage.totalActiveUnits} active work items`
      : `${usage.totalActiveUnits} of ${usage.limit} active-work slots used`;

  return (
    <main className="min-h-screen bg-canvas px-4 py-6 text-text lg:px-8">
      <header className="border-b border-border pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-subtle">WizerView</p>
        <h1 className="mt-1 text-2xl font-semibold">Projects</h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
          <p>Client engagements, review work, and incoming requests.</p>
          {usage ? <span className={usage.overLimit ? 'font-medium text-amber-700' : ''}>{usageLabel}</span> : null}
        </div>
        {usage?.overLimit ? <p className="mt-2 text-sm text-amber-700">Existing work remains available. Close or archive work before starting anything else.</p> : null}
      </header>

      <section className="mt-5 rounded-lg border border-border bg-surface p-4">
        <p className="font-semibold">Create project</p>
        <p className="mt-1 text-sm text-text-muted">A Project uses one active-work slot; Reviews within it do not use additional slots.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Project name" className="rounded-md border border-border px-3 py-2 text-sm" />
          <input value={client} onChange={(event) => setClient(event.target.value)} placeholder="Client name" className="rounded-md border border-border px-3 py-2 text-sm" />
          <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional description" className="rounded-md border border-border px-3 py-2 text-sm" />
        </div>
        <button type="button" disabled={isCreating} onClick={() => void create()} className="mt-3 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{isCreating ? 'Creating…' : 'Create project'}</button>
      </section>

      {notice ? <p className="mt-3 text-sm text-text-muted" role="status">{notice}</p> : null}

      {!projects.length && !standaloneReviews.length ? <section className="mt-5 rounded-lg border border-border bg-surface-muted p-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-subtle">First review checklist</p><ol className="mt-3 grid gap-2 text-sm text-text-muted sm:grid-cols-3"><li><span className="font-semibold text-text">1.</span> Create a Project</li><li><span className="font-semibold text-text">2.</span> Add a Review and deliverable</li><li><span className="font-semibold text-text">3.</span> Share the Project link</li></ol></section> : null}

      <section className="mt-5 space-y-3">
        {projects.length ? projects.map((project) => {
          const projectRequests = requests.filter((request) => request.projectId === project.id);
          const attention = project.reviews.filter((review) => review.openComments > 0 || review.status === 'Changes Requested').length;
          return <article key={project.id} className="rounded-lg border border-border bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="font-semibold">{project.name}</h2><p className="mt-1 text-sm text-text-muted">{project.client || 'No client'} · {project.reviews.length} reviews{attention ? ` · ${attention} need attention` : ''}{projectRequests.length ? ` · ${projectRequests.length} requests` : ''}</p></div>
              <div className="flex flex-wrap gap-2"><Link href={`/reviews/new?projectId=${project.id}`} className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white">Add review</Link><button type="button" onClick={() => void shareProject(project)} className="rounded-md border border-border px-3 py-2 text-sm font-semibold disabled:opacity-50">Share project</button></div>
            </div>
            <div className="mt-3 border-t border-border pt-3"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle">Reviews</p><div className="mt-2 space-y-2">{project.reviews.length ? project.reviews.map((review) => <Link key={review.id} href={`/reviews/${review.id}`} className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-surface-muted"><span>{review.title}</span><span className="text-xs text-text-muted">{review.status} · {review.openComments} open</span></Link>) : <p className="text-sm text-text-muted">No reviews in this project yet.</p>}</div></div>
            <div className="mt-3 border-t border-border pt-3"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle">Requests</p><div className="mt-2 space-y-2">{projectRequests.length ? projectRequests.map((request) => <Link key={request.id} href={`/projects/${project.id}/requests/${request.id}`} className="block rounded-md bg-surface-muted px-3 py-3 transition hover:bg-surface"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{request.title}</h3><p className="mt-1 text-sm text-text-muted">From {request.requestedByName}</p><p className="mt-2 line-clamp-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-text-muted">{request.brief}</p></div><span className="text-xs font-semibold text-text-muted">{request.status.replaceAll('_', ' ')}</span></div></Link>) : <p className="text-sm text-text-muted">No client requests yet.</p>}</div></div>
          </article>;
        }) : <p className="rounded-lg border border-dashed border-border p-6 text-sm text-text-muted">No projects yet. Create a project to organize client reviews.</p>}
      </section>

      <section className="mt-5 rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Standalone reviews</h2><p className="mt-1 text-sm text-text-muted">A standalone open Review uses one active-work slot.</p></div><Link href="/reviews/new" className="rounded-md border border-border px-3 py-2 text-sm font-semibold">New review</Link></div>
        {standaloneReviews.length ? <div className="mt-3 space-y-2 border-t border-border pt-3">{standaloneReviews.map((review) => <Link key={review.id} href={`/reviews/${review.id}`} className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-surface-muted"><span>{review.title}</span><span className="text-xs text-text-muted">{review.status} · {review.openComments} open</span></Link>)}</div> : null}
      </section>
    </main>
  );
}
