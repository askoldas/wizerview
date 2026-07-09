import type { Metadata } from 'next';
import { CreateReviewRedirect } from '@/components/app-shell/create-review-redirect';
import { ProtectedRoute } from '@/components/app-shell/protected-route';

export const metadata: Metadata = {
  title: 'New review — WizerView',
  robots: { index: false, follow: false },
};

export default function NewReviewPage() {
  return (
    <ProtectedRoute>
      <CreateReviewRedirect />
    </ProtectedRoute>
  );
}
