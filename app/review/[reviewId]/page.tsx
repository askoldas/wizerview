import { ClientReviewPage } from '@/components/client-review-page';

interface ReviewPageProps {
  params: {
    reviewId: string;
  };
}

export default function ReviewPage({ params }: ReviewPageProps) {
  return <ClientReviewPage reviewId={params.reviewId} />;
}
