import { CreatorProjectRequestPage } from '@/components/creator-project-request-page';

export default function CreatorProjectRequestRoute({ params }: { params: { projectId: string; requestId: string } }) {
  return <CreatorProjectRequestPage projectId={params.projectId} requestId={params.requestId} />;
}
