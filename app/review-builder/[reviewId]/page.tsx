import { ReviewBuilder } from '@/components/review-builder';
import { createEmptyReviewData } from '@/lib/review-service';

interface ReviewBuilderPageProps {
  params: {
    reviewId: string;
  };
}

export default function ReviewBuilderPage({ params }: ReviewBuilderPageProps) {
  return <ReviewBuilder initialReview={createEmptyReviewData(params.reviewId)} />;
}
