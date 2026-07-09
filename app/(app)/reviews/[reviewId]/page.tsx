import type { Metadata } from 'next';
import { ProtectedRoute } from '@/components/app-shell/protected-route';
import { ReviewBuilder } from '@/components/review-builder';
import { createEmptyReviewData } from '@/lib/review-service';

interface ReviewPageProps {
  params: {
    reviewId: string;
  };
}

export const metadata: Metadata = {
  title: 'Review workspace — WizerView',
  robots: { index: false, follow: false },
};

export default function ReviewPage({ params }: ReviewPageProps) {
  return (
    <ProtectedRoute>
      <ReviewBuilder initialReview={createEmptyReviewData(params.reviewId)} />
    </ProtectedRoute>
  );
}
