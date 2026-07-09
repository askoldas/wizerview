import { redirect } from 'next/navigation';

interface SharedReviewPageProps {
  params: {
    shareToken: string;
  };
}

export default function SharedReviewPage({ params }: SharedReviewPageProps) {
  redirect(`/review/${params.shareToken}`);
}
