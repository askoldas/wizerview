"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createReview } from '@/lib/review-service';

export function CreateReviewRedirect() {
  const router = useRouter();
  const [message, setMessage] = useState('Creating review...');

  useEffect(() => {
    createReview()
      .then((review) => router.replace(`/reviews/${review.id}`))
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Could not create review.'));
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 text-sm text-text-muted">
      {message}
    </main>
  );
}
