import { createHmac, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export const guestReviewerCookieName = 'wizerview_guest_reviewer';
const secret = process.env.GUEST_SESSION_SECRET;

export function signGuestReviewerSession(value: string) {
  return secret ? createHmac('sha256', secret).update(value).digest('base64url') : '';
}

export function isGuestReviewerSessionConfigured() {
  return Boolean(secret);
}

export async function getVerifiedGuestReviewerSession(request: NextRequest, supabase: SupabaseClient, shareToken: string) {
  if (!secret) return null;

  const raw = request.cookies.get(guestReviewerCookieName)?.value?.split('.') ?? [];
  if (raw.length < 4) return null;
  const signature = raw.pop()!;
  const value = raw.join('.');
  const expected = signGuestReviewerSession(value);
  if (!expected || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  const { data: access } = await supabase.rpc('resolve_review_access', { p_share_token: shareToken, p_access_code: null });
  const reviewId = access && typeof access === 'object' && 'reviewId' in access ? String(access.reviewId) : null;
  if (!reviewId || reviewId !== raw[1] || access.mode !== 'guest') return null;

  const { data: session } = await supabase.rpc('get_guest_reviewer_session', {
    p_session_id: raw[0],
    p_review_id: reviewId,
  });
  if (!session || typeof session !== 'object' || !('sessionId' in session) || !('displayName' in session)) return null;

  return { sessionId: String(session.sessionId), reviewId, displayName: String(session.displayName) };
}
