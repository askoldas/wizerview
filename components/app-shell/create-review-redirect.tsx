"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createReview } from '@/lib/review-service';

export function CreateReviewRedirect() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [router]);

  const submit = async () => {
    setIsCreating(true);
    setMessage(null);
    try {
      const review = await createReview(title);
      router.replace(`/reviews/${review.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create review.');
      setIsCreating(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <form onSubmit={(event) => { event.preventDefault(); void submit(); }} onKeyDown={(event) => { if (event.key === 'Escape') router.replace('/dashboard'); }} className="w-full max-w-sm rounded-[14px] border border-stone-200 bg-white p-5 shadow-2xl">
        <h1 className="text-lg font-semibold text-stone-950">New Review</h1>
        <label className="mt-4 block text-sm font-semibold text-stone-800">
          Review name
          <input ref={inputRef} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Untitled review" className="mt-2 w-full rounded-[8px] border border-stone-200 px-3 py-2.5 text-sm font-normal text-stone-950 outline-none focus:border-stone-500" />
        </label>
        <p className="mt-2 text-sm leading-5 text-stone-500">Give this review a descriptive name. You can rename it later.</p>
        {message ? <p className="mt-3 text-sm text-rose-700" role="alert">{message}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => router.replace('/dashboard')} disabled={isCreating} className="rounded-[8px] px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100">Cancel</button>
          <button type="submit" disabled={isCreating} className="rounded-[8px] bg-stone-950 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60">{isCreating ? 'Creating...' : 'Create Review'}</button>
        </div>
      </form>
    </main>
  );
}
