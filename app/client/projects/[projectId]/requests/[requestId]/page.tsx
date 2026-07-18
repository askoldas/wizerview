import { redirect } from 'next/navigation';
import { ClientRequestPage } from '@/components/client-request-page';
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server';

export const metadata = { title: 'Project Request — WizerView', robots: { index: false, follow: false } };

export default async function ClientRequestRoute({ params }: { params: { projectId: string; requestId: string } }) {
  const user = await getServerUser();
  if (!user) redirect(`/client/sign-in?next=${encodeURIComponent(`/client/projects/${params.projectId}/requests/${params.requestId}`)}`);
  const supabase = await createSupabaseServerClient();
  const [{ data: request }, { data: messages }, { data: references }, { data: profile }] = await Promise.all([
    supabase!.from('project_requests').select('id, project_id, title, brief, status').eq('id', params.requestId).eq('project_id', params.projectId).maybeSingle(),
    supabase!.from('project_request_messages').select('id, author_name, body').eq('request_id', params.requestId).order('created_at'),
    supabase!.from('project_request_references').select('id, title, url, note').eq('request_id', params.requestId).order('sort_order'),
    supabase!.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle(),
  ]);
  if (!request) redirect(`/client/projects/${params.projectId}`);
  return <ClientRequestPage projectId={params.projectId} request={{ id: request.id, title: request.title, brief: request.brief, status: request.status }} messages={(messages ?? []).map((item) => ({ id: item.id, authorName: item.author_name, body: item.body }))} references={(references ?? []).map((item) => ({ id: item.id, title: item.title, url: item.url, note: item.note }))} displayName={profile?.display_name ?? user.email ?? 'Client'} />;
}
