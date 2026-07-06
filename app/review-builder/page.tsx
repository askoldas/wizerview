import { ReviewBuilder } from '@/components/review-builder';
import { initialReview } from '@/lib/mock-data';

export default function ReviewBuilderPage() {
  return <ReviewBuilder initialReview={initialReview} />;
}
