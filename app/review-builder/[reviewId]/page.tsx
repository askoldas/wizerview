import { redirect } from 'next/navigation';

interface ReviewBuilderPageProps {
  params: {
    reviewId: string;
  };
}

export default function ReviewBuilderPage({ params }: ReviewBuilderPageProps) {
  redirect(`/reviews/${params.reviewId}`);
}
