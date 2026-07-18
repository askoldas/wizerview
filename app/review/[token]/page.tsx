import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ReviewWorkspace } from '@/components/review-workspace';
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server';

interface ReviewPageProps {
  params: {
    token: string;
  };
}

export const metadata: Metadata = {
  title: 'Client review — WizerView',
  robots: { index: false, follow: false },
};

export default async function ReviewPage({ params }: ReviewPageProps) {
  const supabase = await createSupabaseServerClient();
  const user = await getServerUser();
  const { data } = supabase ? await supabase.rpc('resolve_review_access', { p_share_token: params.token, p_access_code: null }) : { data: null };
  const access = data as { mode?: string; reviewId?: string; projectId?: string } | null;
  if (access?.mode === 'creator' && access.reviewId) redirect(`/reviews/${access.reviewId}`);
  if (access?.mode === 'authenticated_project_client' && access.reviewId && access.projectId) redirect(`/client/projects/${access.projectId}/reviews/${access.reviewId}`);
  if (!access || access.mode === 'denied') {
    return <main className="flex min-h-screen items-center justify-center bg-canvas px-4 text-text"><section className="max-w-md rounded-lg border border-border bg-surface p-6"><h1 className="text-xl font-semibold">This review is not available</h1><p className="mt-2 text-sm text-text-muted">The link may be unavailable or require access you do not have.</p></section></main>;
  }
  let authenticatedReviewer: { displayName: string; email: string } | undefined;
  if (user && access.mode === 'authenticated_standalone') {
    const { data: profile } = await supabase!.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle();
    authenticatedReviewer = { displayName: profile?.display_name ?? '', email: user.email ?? '' };
  }
  return <ReviewWorkspace mode="client" shareToken={params.token} authenticatedReviewer={authenticatedReviewer} />;
}
