import type { Metadata } from 'next';
import { ReviewWorkspace } from '@/components/review-workspace';

interface ReviewPageProps {
  params: {
    token: string;
  };
}

export const metadata: Metadata = {
  title: 'Client review — WizerView',
  robots: { index: false, follow: false },
};

export default function ReviewPage({ params }: ReviewPageProps) {
  return <ReviewWorkspace mode="client" shareToken={params.token} />;
}
