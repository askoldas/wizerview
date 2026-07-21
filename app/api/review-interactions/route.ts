import { NextResponse, type NextRequest } from 'next/server';
import { getVerifiedGuestReviewerSession } from '@/lib/guest-reviewer-session';
import { createSupabaseServerClient } from '@/lib/supabase-server';

type Interaction = 'comment' | 'feedback' | 'decision';

export async function POST(request: NextRequest) {
  const body = await request.json() as Record<string, unknown>;
  const interaction = body.interaction as Interaction;
  const shareToken = typeof body.shareToken === 'string' ? body.shareToken : '';
  const reviewId = typeof body.reviewId === 'string' ? body.reviewId : '';
  if (!['comment', 'feedback', 'decision'].includes(interaction) || !shareToken || !reviewId) {
    return NextResponse.json({ error: 'Invalid review interaction.' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  const guestSession = await getVerifiedGuestReviewerSession(request, supabase, shareToken);
  const bodyText = typeof body.body === 'string' ? body.body : '';
  const reviewerName = typeof body.reviewerName === 'string' ? body.reviewerName : '';
  let error: { message?: string } | null = null;

  if (interaction === 'comment') {
    const input = { p_share_token: shareToken, p_review_id: reviewId, p_comment_id: String(body.id ?? ''), p_asset_id: typeof body.assetId === 'string' ? body.assetId : null, p_asset_version_id: typeof body.assetVersionId === 'string' ? body.assetVersionId : null, p_parent_comment_id: typeof body.parentCommentId === 'string' ? body.parentCommentId : null, p_body: bodyText, p_x_percent: typeof body.x === 'number' ? body.x : null, p_y_percent: typeof body.y === 'number' ? body.y : null, p_page_number: typeof body.pageNumber === 'number' ? body.pageNumber : null };
    ({ error } = guestSession
      ? await supabase.rpc('add_guest_shared_comment', { ...input, p_guest_session_id: guestSession.sessionId })
      : await supabase.rpc('add_shared_comment', { ...input, p_author_name: reviewerName }));
  }

  if (interaction === 'feedback') {
    const input = { p_share_token: shareToken, p_review_id: reviewId, p_feedback_id: String(body.id ?? ''), p_body: bodyText };
    ({ error } = guestSession
      ? await supabase.rpc('add_guest_shared_feedback', { ...input, p_guest_session_id: guestSession.sessionId })
      : await supabase.rpc('add_shared_feedback', { ...input, p_reviewer_name: reviewerName }));
  }

  if (interaction === 'decision') {
    const input = { p_share_token: shareToken, p_review_id: reviewId, p_decision_id: String(body.id ?? ''), p_asset_id: String(body.assetId ?? ''), p_asset_version_id: typeof body.assetVersionId === 'string' ? body.assetVersionId : null, p_type: String(body.type ?? ''), p_note: typeof body.note === 'string' ? body.note : '' };
    ({ error } = guestSession
      ? await supabase.rpc('add_guest_shared_decision', { ...input, p_guest_session_id: guestSession.sessionId })
      : await supabase.rpc('add_shared_decision', { ...input, p_reviewer_name: reviewerName }));
  }

  if (error) return NextResponse.json({ error: error.message ?? 'Could not save this review interaction.' }, { status: 400 });
  return NextResponse.json({ ok: true, usedGuestSession: Boolean(guestSession) });
}
