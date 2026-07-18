import { redirect } from 'next/navigation';
import { ClientProjectPage } from '@/components/client-project-page';
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server';

export const metadata = { title: 'Client Project — WizerView', robots: { index: false, follow: false } };

export default async function ClientProjectRoute({ params }: { params: { projectId: string } }) {
  const user = await getServerUser();
  if (!user) redirect(`/client/sign-in?next=${encodeURIComponent(`/client/projects/${params.projectId}`)}`);
  const supabase = await createSupabaseServerClient();
  const [{ data: project }, { data: reviews }, { data: requests }] = await Promise.all([
    supabase!.from('projects').select('id, name, client_name, description').eq('id', params.projectId).maybeSingle(),
    supabase!.from('reviews').select('id, title, share_token, status').eq('project_id', params.projectId).eq('client_visible', true).in('lifecycle', ['open', 'closed']).order('updated_at', { ascending: false }),
    supabase!.from('project_requests').select('id, title, status').eq('project_id', params.projectId).eq('client_visible', true).is('withdrawn_at', null).order('updated_at', { ascending: false }),
  ]);
  if (!project) redirect('/client?project=unavailable');
  return <ClientProjectPage project={{ id: project.id, name: project.name, clientName: project.client_name ?? '', description: project.description ?? '' }} reviews={(reviews ?? []).map((review) => ({ id: review.id, title: review.title, shareToken: review.share_token, status: review.status }))} requests={(requests ?? []).map((request) => ({ id: request.id, title: request.title, status: request.status }))} />;
}
