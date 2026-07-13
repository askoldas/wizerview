"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { loadSharedProject, type SharedProject } from '@/lib/review-service';

function statusLabel(status: string) {
  if (status === 'changes_requested') return 'Changes requested';
  if (status === 'direction_selected') return 'Version selected';
  if (status === 'approved') return 'Approved';
  if (status === 'completed') return 'Reviewed';
  return 'Ready for review';
}

export function SharedProjectPage({ shareToken }: { shareToken: string }) {
  const [project, setProject] = useState<SharedProject | null | undefined>(undefined);
  useEffect(() => { void loadSharedProject(shareToken).then(setProject); }, [shareToken]);
  if (project === undefined) return <main className="min-h-screen bg-canvas px-4 py-6 text-sm text-text-muted lg:px-8">Loading project…</main>;
  if (!project) return <main className="min-h-screen bg-canvas px-4 py-6 text-text lg:px-8"><section className="rounded-lg border border-border bg-surface p-5"><h1 className="text-xl font-semibold">This project is not available</h1><p className="mt-2 text-sm text-text-muted">The link may have expired, been disabled, or been copied incorrectly. Please contact the person who shared it with you.</p></section></main>;
  const completed = project.reviews.filter((review) => ['approved', 'completed'].includes(review.status));
  const active = project.reviews.filter((review) => !['approved', 'completed'].includes(review.status));
  const renderReview = (review: SharedProject['reviews'][number]) => <Link key={review.shareToken} href={`/review/${review.shareToken}?project=${encodeURIComponent(shareToken)}`} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4 transition hover:bg-surface-muted"><div><h2 className="font-semibold text-text">{review.title}</h2><p className="mt-1 text-sm text-text-muted">{review.deliverableCount} deliverables{review.openCommentCount ? ` · ${review.openCommentCount} open comments` : ''}</p></div><div className="flex items-center gap-3"><span className="text-xs font-semibold text-text-muted">{statusLabel(review.status)}</span><span className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white">Open review</span></div></Link>;
  return <main className="min-h-screen bg-canvas px-4 py-6 text-text lg:px-8"><header className="border-b border-border pb-5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-subtle">WizerView</p><h1 className="mt-2 text-3xl font-semibold">{project.title}</h1>{project.client ? <p className="mt-2 text-sm text-text-muted">{project.client}</p> : null}{project.description ? <p className="mt-4 max-w-3xl text-sm leading-6 text-text-muted">{project.description}</p> : null}<p className="mt-4 text-sm text-text-muted">{completed.length} of {project.reviews.length} reviews completed</p></header><section className="mt-5 space-y-6">{active.length ? <div><h2 className="text-lg font-semibold">Needs your attention</h2><div className="mt-3 space-y-2">{active.map(renderReview)}</div></div> : null}{completed.length ? <div><h2 className="text-lg font-semibold">Completed</h2><div className="mt-3 space-y-2 opacity-75">{completed.map(renderReview)}</div></div> : null}{!project.reviews.length ? <p className="rounded-lg border border-dashed border-border p-6 text-sm text-text-muted">There are no reviews ready to share in this project yet.</p> : null}</section></main>;
}
