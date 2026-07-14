"use client";

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { addSharedProjectRequest, loadSharedProject, type SharedProject } from '@/lib/review-service';

function reviewStatusLabel(status: string) {
  if (status === 'changes_requested') return 'Changes requested';
  if (status === 'direction_selected') return 'Version selected';
  if (status === 'approved') return 'Approved';
  if (status === 'completed') return 'Reviewed';
  return 'Ready for review';
}

function requestStatusLabel(status: string) {
  return status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function SharedProjectPage({ shareToken }: { shareToken: string }) {
  const [project, setProject] = useState<SharedProject | null | undefined>(undefined);
  const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);
  const [requestTitle, setRequestTitle] = useState('');
  const [requestBrief, setRequestBrief] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [accessMessage, setAccessMessage] = useState<string | null>(null);

  const loadProject = useCallback(async (code?: string) => { const next = await loadSharedProject(shareToken, code); setProject(next); return next; }, [shareToken]);

  useEffect(() => {
    void loadProject();
    const savedName = window.sessionStorage.getItem(`wizerview:project-reviewer:${shareToken}`);
    if (savedName) setRequesterName(savedName);
  }, [loadProject, shareToken]);

  const submitRequest = async () => {
    setIsSendingRequest(true);
    setRequestMessage(null);
    try {
      await addSharedProjectRequest({
        shareToken,
        reviewerName: requesterName,
        title: requestTitle,
        brief: requestBrief,
      });
      window.sessionStorage.setItem(`wizerview:project-reviewer:${shareToken}`, requesterName.trim());
      setRequestMessage('Request sent. The creator can review it and reply here.');
      setRequestTitle('');
      setRequestBrief('');
      setIsRequestFormOpen(false);
      await loadProject();
    } catch {
      setRequestMessage('Could not send the request. Please try again.');
    } finally {
      setIsSendingRequest(false);
    }
  };

  if (project === undefined) {
    return <main className="min-h-screen bg-canvas px-4 py-6 text-sm text-text-muted lg:px-8">Loading project…</main>;
  }

  if (!project) {
    return <main className="min-h-screen bg-canvas px-4 py-6 text-text lg:px-8"><section className="rounded-lg border border-border bg-surface p-5"><h1 className="text-xl font-semibold">This project is not available</h1><p className="mt-2 text-sm text-text-muted">The link may have expired, been disabled, or been copied incorrectly. Please contact the person who shared it with you.</p></section></main>;
  }

  if (project.requiresAccessCode) {
    return <main className="min-h-screen bg-canvas px-4 py-6 text-text lg:px-8"><section className="mx-auto mt-12 max-w-md rounded-lg border border-border bg-surface p-5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-subtle">WizerView</p><h1 className="mt-2 text-xl font-semibold">Enter project access code</h1><p className="mt-2 text-sm text-text-muted">This project is protected by the creator.</p><form onSubmit={(event) => { event.preventDefault(); setAccessMessage(null); void loadProject(accessCode).then((next) => { if (!next || next.requiresAccessCode) setAccessMessage('That code could not be verified.'); else window.sessionStorage.setItem(`wizerview:project-access:${shareToken}`, accessCode); }); }} className="mt-4"><input required type="password" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} placeholder="Access code" className="w-full rounded-md border border-border px-3 py-2"/><button className="mt-3 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white">Open project</button></form>{accessMessage ? <p className="mt-3 text-sm text-text-muted" role="status">{accessMessage}</p> : null}</section></main>;
  }

  const completed = project.reviews.filter((review) => ['approved', 'completed'].includes(review.status));
  const active = project.reviews.filter((review) => !['approved', 'completed'].includes(review.status));
  const requests = project.requests ?? [];
  const renderReview = (review: SharedProject['reviews'][number]) => <Link key={review.shareToken} href={`/review/${review.shareToken}?project=${encodeURIComponent(shareToken)}`} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4 transition hover:bg-surface-muted"><div><h2 className="font-semibold text-text">{review.title}</h2><p className="mt-1 text-sm text-text-muted">{review.deliverableCount} deliverables{review.openCommentCount ? ` · ${review.openCommentCount} open comments` : ''}</p></div><div className="flex items-center gap-3"><span className="text-xs font-semibold text-text-muted">{reviewStatusLabel(review.status)}</span><span className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white">Open review</span></div></Link>;

  return <main className="min-h-screen bg-canvas px-4 py-6 text-text lg:px-8"><header className="border-b border-border pb-5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-subtle">WizerView</p><h1 className="mt-2 text-3xl font-semibold">{project.title}</h1>{project.client ? <p className="mt-2 text-sm text-text-muted">{project.client}</p> : null}{project.description ? <p className="mt-4 max-w-3xl text-sm leading-6 text-text-muted">{project.description}</p> : null}<p className="mt-4 text-sm text-text-muted">{completed.length} of {project.reviews.length} reviews completed</p></header><section className="mt-5 space-y-6">{active.length ? <div><h2 className="text-lg font-semibold">Needs your attention</h2><div className="mt-3 space-y-2">{active.map(renderReview)}</div></div> : null}{project.allowClientRequests ? <div><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Requests</h2><p className="mt-1 text-sm text-text-muted">Ask for new work without mixing it into a review.</p></div><button type="button" onClick={() => setIsRequestFormOpen((current) => !current)} className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white">Request something new</button></div>{isRequestFormOpen ? <form onSubmit={(event) => { event.preventDefault(); void submitRequest(); }} className="mt-3 rounded-lg border border-border bg-surface p-4"><label className="block text-sm font-semibold">Your name<input required value={requesterName} onChange={(event) => setRequesterName(event.target.value)} className="mt-2 w-full rounded-md border border-border px-3 py-2 font-normal" /></label><label className="mt-3 block text-sm font-semibold">Request title<input required maxLength={160} value={requestTitle} onChange={(event) => setRequestTitle(event.target.value)} className="mt-2 w-full rounded-md border border-border px-3 py-2 font-normal" /></label><label className="mt-3 block text-sm font-semibold">What do you need?<textarea required maxLength={5000} value={requestBrief} onChange={(event) => setRequestBrief(event.target.value)} className="mt-2 min-h-28 w-full rounded-md border border-border px-3 py-2 font-normal" /></label><div className="mt-3 flex gap-2"><button disabled={isSendingRequest} className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{isSendingRequest ? 'Sending…' : 'Send request'}</button><button type="button" onClick={() => setIsRequestFormOpen(false)} className="rounded-md border border-border px-3 py-2 text-sm font-semibold">Cancel</button></div></form> : null}{requestMessage ? <p className="mt-3 text-sm text-text-muted" role="status">{requestMessage}</p> : null}{requests.length ? <div className="mt-3 space-y-2">{requests.map((request) => <Link key={request.id} href={`/project/${shareToken}/requests/${request.id}`} className="block rounded-lg border border-border bg-surface p-4 transition hover:bg-surface-muted"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{request.title}</p><span className="text-xs font-semibold text-text-muted">{requestStatusLabel(request.status)}</span></div><p className="mt-1 text-sm text-text-muted">Requested by {request.requestedByName}</p>{request.linkedReviewShareToken ? <span className="mt-3 inline-block text-sm font-semibold text-brand">Open linked review</span> : null}</Link>)}</div> : <p className="mt-3 text-sm text-text-muted">No requests yet.</p>}</div> : null}{completed.length ? <div><h2 className="text-lg font-semibold">Completed</h2><div className="mt-3 space-y-2 opacity-75">{completed.map(renderReview)}</div></div> : null}{!project.reviews.length ? <p className="rounded-lg border border-dashed border-border p-6 text-sm text-text-muted">There are no reviews ready to share in this project yet.</p> : null}</section></main>;
}
