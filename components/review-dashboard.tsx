"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { AuthModal } from '@/components/auth/auth-modal';
import { BrandLogo } from '@/components/brand-logo';
import { deleteReview, getReviewShareToken, listReviews, markReviewSeen, type ReviewSummary } from '@/lib/review-service';
import { createSupabaseClientInstance } from '@/lib/supabase';

function getInitials(email?: string | null) {
  if (!email) return 'WV';
  return email
    .split('@')[0]
    .split(/[._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'WV';
}

function statusLabel(status: string) {
  return status === 'Direction Selected' ? 'Version selected' : status;
}

function statusClasses(status: string) {
  if (status === 'Approved') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (status === 'Draft') return 'bg-amber-50 text-amber-700 ring-amber-200';
  if (status === 'Changes Requested') return 'bg-rose-50 text-rose-700 ring-rose-200';
  if (status === 'Direction Selected') return 'bg-sky-50 text-sky-700 ring-sky-200';
  return 'bg-surface-muted text-text-muted ring-border';
}

export function ReviewDashboard() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClientInstance(), []);
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const lastUserId = useRef<string | null>(null);

  const activeReviews = reviews.filter((review) => review.status !== 'Approved').length;
  const newActivity = reviews.reduce((total, review) => total + review.newActivity, 0);
  const approvedReviews = reviews.filter((review) => review.status === 'Approved').length;

  const loadReviews = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      setReviews(await listReviews());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load reviews.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!supabase) {
      setIsAuthReady(true);
      setIsLoading(false);
      return;
    }

    let ignored = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!ignored) {
        setUser(data.user ?? null);
        lastUserId.current = data.user?.id ?? null;
        setIsAuthReady(true);
      }
    }).catch(() => {
      if (!ignored) {
        setIsAuthReady(true);
        setIsLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id ?? null;
      if (lastUserId.current === nextUserId) return;

      lastUserId.current = nextUserId;
      setUser(session?.user ?? null);
      setIsAuthReady(true);
    });

    return () => {
      ignored = true;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!isAuthReady) return;

    if (!user) {
      setReviews([]);
      setIsLoading(false);
      return;
    }

    void loadReviews();
  }, [isAuthReady, user]);

  const openAuthModal = (mode: 'login' | 'signup') => {
    router.push(`/dashboard?auth=${mode}&next=${encodeURIComponent('/dashboard')}`);
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setReviews([]);
    setMessage(null);
  };

  const handleCreateReview = async () => {
    if (!user) {
      openAuthModal('signup');
      return;
    }

    router.push('/reviews/new');
  };

  const handleOpenReview = async (reviewId: string) => {
    setMessage(null);

    try {
      await markReviewSeen(reviewId);
      setReviews((current) =>
        current.map((review) =>
          review.id === reviewId
            ? {
                ...review,
                newComments: 0,
                newFeedback: 0,
                newActivity: 0,
              }
            : review
        )
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not mark review as seen.');
    }

    router.push(`/reviews/${reviewId}`);
  };

  const copyReviewLink = async (review: ReviewSummary) => {
    let shareToken: string | null;
    try {
      shareToken = await getReviewShareToken(review.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not prepare the review link.');
      return;
    }
    if (!shareToken) { setMessage('No share token is available for this review.'); return; }

    const shareLink = typeof window !== 'undefined' ? `${window.location.origin}/review/${shareToken}` : `/review/${shareToken}`;

    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      setMessage(shareLink);
      return;
    }

    await navigator.clipboard.writeText(shareLink);
    setMessage('Review link copied.');
  };

  const handleDeleteReview = async (review: ReviewSummary) => {
    if (!user) {
      setMessage('Sign in to delete reviews.');
      return;
    }

    const confirmed = window.confirm(`Delete "${review.title}"? This removes the review, deliverables, versions, comments, feedback, and decisions.`);
    if (!confirmed) return;

    setDeletingReviewId(review.id);
    setMessage(null);

    try {
      await deleteReview(review.id);
      setReviews((current) => current.filter((candidate) => candidate.id !== review.id));
      setMessage('Review deleted.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not delete review.');
    } finally {
      setDeletingReviewId(null);
    }
  };

  const activityText = (review: ReviewSummary) => {
    const parts = [`${review.openComments} open comments`, `${review.resolvedComments} resolved`];
    if (review.newComments > 0) parts.push(`${review.newComments} new comments`);
    if (review.newFeedback > 0) parts.push(`${review.newFeedback} new feedback`);
    if (review.feedback > 0) parts.push(`${review.feedback} feedback`);
    if (review.decisions > 0) parts.push(`${review.decisions} decisions`);
    return parts.join(' / ');
  };

  return (
    <main className="flex min-h-screen flex-col bg-canvas text-text">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur lg:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <BrandLogo href="/dashboard" />
            <span className="h-5 w-px bg-border" />
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-text-subtle">Review dashboard</span>
            <h1 className="text-sm font-semibold text-text sm:text-base">Reviews</h1>
            {message ? <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs text-text-muted">{message}</span> : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {user ? (
              <>
                <div className="flex items-center gap-2 rounded-md bg-surface-muted px-2 py-1.5 text-sm text-text-muted">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-xs font-semibold text-text shadow-sm">{getInitials(user.email)}</span>
                  <span className="max-w-[220px] truncate">{user.email}</span>
                </div>
                <button type="button" onClick={handleSignOut} className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-text-muted hover:bg-surface-muted">
                  Log out
                </button>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => openAuthModal('login')} className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-text-muted hover:bg-surface-muted">
                  Sign in
                </button>
                <button type="button" onClick={() => openAuthModal('signup')} className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-strong">
                  Create account
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={handleCreateReview}
              disabled={isCreating}
              className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? 'Creating...' : 'New review'}
            </button>
          </div>
        </div>
      </header>

      <div className="grid flex-1 lg:grid-cols-[176px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-surface-muted/80 p-3 lg:border-b-0 lg:border-r">
          <nav className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-4 lg:grid-cols-1">
            <Link href="/dashboard" className="flex items-center justify-between rounded-md bg-surface px-3 py-2 font-semibold text-text shadow-sm ring-1 ring-border">
              Reviews
              <span className="text-xs text-text-subtle">{reviews.length}</span>
            </Link>
            <span className="flex items-center justify-between rounded-md px-3 py-2 text-text-subtle">
              New activity
              <span className="text-xs">{newActivity}</span>
            </span>
            <span className="flex items-center justify-between rounded-md px-3 py-2 text-text-subtle">
              Archive
              <span className="text-xs">0</span>
            </span>
            <span className="flex items-center justify-between rounded-md px-3 py-2 text-text-subtle">
              Account
            </span>
          </nav>
        </aside>

        <section className="min-w-0 px-4 py-5 lg:px-6">
          <div className="flex flex-col gap-3 border-b border-border pb-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-subtle">Client review workspace</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-text">Recent reviews</h2>
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-text-muted">
              <span className="rounded-md bg-surface px-3 py-2 ring-1 ring-border">{activeReviews} active</span>
              <span className="rounded-md bg-surface px-3 py-2 ring-1 ring-border">{newActivity} new activity</span>
              <span className="rounded-md bg-surface px-3 py-2 ring-1 ring-border">{approvedReviews} approved</span>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-border bg-surface">
            {isLoading ? (
              <div className="p-5 text-sm text-text-muted">Loading reviews...</div>
            ) : reviews.length === 0 ? (
              <div className="flex min-h-[280px] items-center justify-center p-6 text-center">
                <div className="max-w-sm">
                  <h3 className="text-lg font-semibold text-text">Create your first review</h3>
                  <p className="mt-2 text-sm leading-6 text-text-muted">Upload visual work, share one link, and collect pinned feedback.</p>
                  <button
                    type="button"
                    onClick={user ? handleCreateReview : () => openAuthModal('signup')}
                    disabled={isCreating}
                    className="mt-4 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {user ? 'New review' : 'Create account'}
                  </button>
                </div>
              </div>
            ) : (
              reviews.map((review, index) => (
                <article key={review.id} className={`grid gap-3 px-4 py-3 text-sm md:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.95fr)_auto] md:items-center ${index > 0 ? 'border-t border-border' : ''}`}>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-text">{review.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-subtle">
                      <span>{review.client || 'No client yet'}</span>
                      <span className="text-border-strong">/</span>
                      <span>Updated {review.updatedAt}</span>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${statusClasses(review.status)}`}>
                        {statusLabel(review.status)}
                      </span>
                      {review.newActivity > 0 ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">{review.newActivity} new</span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-xs text-text-subtle">{activityText(review)}</p>
                    <p className="mt-1 truncate text-xs text-text-subtle">{review.latestActivityLabel} / {review.latestActivityAt}</p>
                  </div>

                  <div className="flex items-center gap-2 md:justify-end">
                    <button type="button" onClick={() => void copyReviewLink(review)} className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-text-muted hover:bg-surface-muted">
                      Copy client link
                    </button>
                    {review.shareToken ? (
                      <a href={`/review/${review.shareToken}`} target="_blank" rel="noreferrer" className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-text-muted hover:bg-surface-muted">
                        Preview as client
                      </a>
                    ) : null}
                    <button type="button" onClick={() => void handleDeleteReview(review)} disabled={deletingReviewId === review.id} className="rounded-[8px] border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60">
                      {deletingReviewId === review.id ? 'Deleting...' : 'Delete'}
                    </button>
                    <button type="button" onClick={() => void handleOpenReview(review.id)} className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-strong">
                      Open
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
      <Suspense fallback={null}>
        <AuthModal defaultNext="/dashboard" />
      </Suspense>
    </main>
  );
}
