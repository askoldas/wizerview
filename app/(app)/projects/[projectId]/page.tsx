import { redirect } from 'next/navigation';

export default function ProjectPage({ params }: { params: { projectId: string } }) {
  redirect(`/dashboard?project=${encodeURIComponent(params.projectId)}`);
}
