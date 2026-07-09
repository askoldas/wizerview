"use client";

import { ReviewWorkspace } from '@/components/review-workspace';

interface ClientReviewPageProps {
  reviewId: string;
}

export function ClientReviewPage({ reviewId }: ClientReviewPageProps) {
  return <ReviewWorkspace mode="client" reviewId={reviewId} />;
}
