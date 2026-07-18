import { redirect } from 'next/navigation';
import { ReviewWorkspace } from '@/components/review-workspace';
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server';

export const metadata = { title: 'Project Review — WizerView', robots: { index: false, follow: false } };

export default async function ClientProjectReviewPage({ params }: { params: { projectId: string; reviewId: string } }) {
  const user = await getServerUser();
  if (!user) redirect(`/client/sign-in?next=${encodeURIComponent(`/client/projects/${params.projectId}/reviews/${params.reviewId}`)}`);
  const supabase = await createSupabaseServerClient();
  const [{ data: review }, { data: profile }] = await Promise.all([
    supabase!.from('reviews').select('id, share_token').eq('id', params.reviewId).eq('project_id', params.projectId).eq('client_visible', true).in('lifecycle', ['open', 'closed']).maybeSingle(),
    supabase!.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle(),
  ]);
  if (!review?.share_token) redirect(`/client/projects/${params.projectId}`);
  return <ReviewWorkspace mode="client" shareToken={review.share_token} authenticatedReviewer={{ displayName: profile?.display_name ?? '', email: user.email ?? '', projectHref: `/client/projects/${params.projectId}` }} />;
}
