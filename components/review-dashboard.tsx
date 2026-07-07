"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { CreatorAuthPanel } from '@/components/creator-auth-panel';
import { createReview, listReviews, type ReviewSummary } from '@/lib/review-service';
import { createSupabaseClientInstance } from '@/lib/supabase';

export function ReviewDashboard() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClientInstance(), []);
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const lastUserId = useRef<string | null>(null);

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

  const handleCreateReview = async () => {
    setIsCreating(true);
    setMessage(null);

    try {
      const review = await createReview();
      router.push(`/review-builder/${review.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create review.');
    } finally {
      setIsCreating(false);
    }
  };

  const activeReviews = reviews.filter((review) => review.status !== 'Approved').length;
  const commentCount = reviews.reduce((total, review) => total + review.comments, 0);
  const firstReviewId = reviews[0]?.id;

  return (
    <main className="min-h-screen px-5 py-6 text-stone-950 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-[14px] border border-stone-200 bg-white/85 p-4 shadow-sm">
          <Link href="/" className="block text-lg font-semibold tracking-tight text-stone-950">
            WizerView
          </Link>
          <nav className="mt-6 space-y-1 text-sm">
            <Link href="/" className="flex items-center justify-between rounded-[10px] bg-stone-950 px-3 py-2.5 font-medium text-white">
              Reviews
              <span>{reviews.length}</span>
            </Link>
            <span className="flex items-center justify-between rounded-[10px] px-3 py-2.5 text-stone-500">
              Projects
              <span>1</span>
            </span>
            <span className="flex items-center justify-between rounded-[10px] px-3 py-2.5 text-stone-500">
              Archive
              <span>0</span>
            </span>
          </nav>
          <div className="mt-6 rounded-[12px] border border-stone-200 bg-stone-50 p-3 text-sm text-stone-600">
            <p className="font-medium text-stone-900">MVP focus</p>
            <p className="mt-1">One shareable review link, visual assets, pinned notes, and a clear decision.</p>
          </div>
        </aside>

        <section className="space-y-5">
          <header className="rounded-[14px] border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500">Client review workspace</p>
                <h1 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-stone-950">Review work where the work actually lives.</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                  Share visual assets, collect pinned comments, compare directions, and get a decision without asking clients to create an account.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateReview}
                disabled={isCreating || !user}
                className="inline-flex items-center justify-center rounded-[10px] bg-stone-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? 'Creating...' : 'New review'}
              </button>
            </div>
            {message ? <p className="mt-3 text-sm font-medium text-stone-600">{message}</p> : null}
          </header>

          <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
            <div className="rounded-[14px] border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-stone-500">Shared links</p>
                  <h2 className="text-lg font-semibold text-stone-950">Recent reviews</h2>
                </div>
                <button type="button" onClick={handleCreateReview} disabled={isCreating || !user} className="rounded-[10px] border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60">
                  Create
                </button>
              </div>

              <div className="mt-4 overflow-hidden rounded-[12px] border border-stone-200">
                {isLoading ? (
                  <div className="bg-white p-5 text-sm text-stone-600">Loading reviews...</div>
                ) : reviews.length === 0 ? (
                  <div className="bg-white p-5 text-sm text-stone-600">
                    {user ? 'No Supabase reviews yet. Create the first one.' : 'Sign in to load your Supabase reviews.'}
                  </div>
                ) : (
                  reviews.map((review, index) => (
                    <article key={review.id} className={`grid gap-3 bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-center ${index > 0 ? 'border-t border-stone-200' : ''}`}>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-stone-950">{review.title}</h3>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${review.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : review.status === 'Draft' ? 'bg-amber-100 text-amber-800' : 'bg-stone-950 text-white'}`}>
                            {review.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-stone-600">{review.client || 'No client yet'}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-stone-400">Updated {review.updatedAt}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-[10px] bg-stone-100 px-3 py-2 text-sm text-stone-600">{review.comments} comments</span>
                        <Link href={`/review-builder/${review.id}`} className="rounded-[10px] border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50">
                          Edit
                        </Link>
                        <Link href={`/review/${review.id}`} className="rounded-[10px] border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50">
                          Open
                        </Link>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>

            <aside className="space-y-5">
              <CreatorAuthPanel />

              <div className="rounded-[14px] border border-stone-900 bg-stone-950 p-4 text-white shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-400">Today</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-3xl font-semibold">{activeReviews}</p>
                    <p className="mt-1 text-sm text-stone-400">active links</p>
                  </div>
                  <div>
                    <p className="text-3xl font-semibold">{commentCount}</p>
                    <p className="mt-1 text-sm text-stone-400">comments</p>
                  </div>
                </div>
                {firstReviewId ? (
                  <Link href={`/review/${firstReviewId}`} className="mt-5 inline-flex rounded-[10px] bg-white px-3 py-2 text-sm font-semibold text-stone-950 hover:bg-stone-200">
                    Preview latest
                  </Link>
                ) : null}
              </div>

              <div className="rounded-[14px] border border-stone-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-stone-950">Review assets</p>
                <div className="mt-3 space-y-2 text-sm text-stone-600">
                  <p className="rounded-[10px] bg-stone-50 px-3 py-2">The asset canvas comes first.</p>
                  <p className="rounded-[10px] bg-stone-50 px-3 py-2">Related assets stay in the same option.</p>
                  <p className="rounded-[10px] bg-stone-50 px-3 py-2">Option B turns the review into a comparison.</p>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
