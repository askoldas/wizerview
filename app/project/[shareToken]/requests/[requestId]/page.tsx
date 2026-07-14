import { SharedProjectRequestPage } from '@/components/shared-project-request-page';

export default function SharedProjectRequestRoute({ params }: { params: { shareToken: string; requestId: string } }) {
  return <SharedProjectRequestPage shareToken={params.shareToken} requestId={params.requestId} />;
}
