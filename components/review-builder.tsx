"use client";

import { ReviewWorkspace } from '@/components/review-workspace';
import type { ReviewData } from '@/lib/mock-data';

interface ReviewBuilderProps {
  initialReview: ReviewData;
}

export function ReviewBuilder({ initialReview }: ReviewBuilderProps) {
  return <ReviewWorkspace mode="creator" reviewId={initialReview.id} initialReview={initialReview} />;
}
