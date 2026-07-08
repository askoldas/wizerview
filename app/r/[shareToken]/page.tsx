import { ReviewWorkspace } from '@/components/review-workspace';

interface SharedReviewPageProps {
  params: {
    shareToken: string;
  };
}

export default function SharedReviewPage({ params }: SharedReviewPageProps) {
  return <ReviewWorkspace mode="client" shareToken={params.shareToken} />;
}
