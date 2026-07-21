import { ProjectSharingSettings } from '@/components/project-sharing-settings';

export default function ProjectSharingSettingsRoute({ params }: { params: { projectId: string } }) {
  return <ProjectSharingSettings projectId={params.projectId} />;
}
