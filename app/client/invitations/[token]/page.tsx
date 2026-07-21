import { redirect } from 'next/navigation';
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server';

export const metadata = { title: 'Project invitation — WizerView', robots: { index: false, follow: false } };

export default async function InvitationPage({ params }: { params: { token: string } }) {
  const user = await getServerUser();
  if (!user) redirect(`/client/sign-in?next=${encodeURIComponent(`/client/invitations/${params.token}`)}`);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase!.rpc('accept_project_client_invitation', { p_raw_token: params.token });
  if (error || !data || typeof data !== 'object' || !('projectId' in data)) redirect('/client?invitation=unavailable');
  redirect(`/client/projects/${String(data.projectId)}`);
}
