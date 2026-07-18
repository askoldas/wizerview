import { redirect } from 'next/navigation';
import { ClientPortal, type ClientPortalProject } from '@/components/client-portal';
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server';

export const metadata = { title: 'Your Projects — WizerView', robots: { index: false, follow: false } };

export default async function ClientPortalPage() {
  const user = await getServerUser();
  if (!user) redirect('/client/sign-in?next=/client');
  const supabase = await createSupabaseServerClient();
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase!.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle(),
    supabase!.from('project_client_memberships').select('project_id, projects!inner(id, name, client_name, description)').eq('user_id', user.id).eq('status', 'active'),
  ]);
  const projects: ClientPortalProject[] = (memberships ?? []).map((membership) => {
    const project = membership.projects as unknown as { id: string; name: string; client_name: string | null; description: string };
    return { id: project.id, name: project.name, clientName: project.client_name ?? '', description: project.description ?? '' };
  });
  return <ClientPortal email={user.email ?? ''} initialDisplayName={profile?.display_name ?? ''} projects={projects} />;
}
