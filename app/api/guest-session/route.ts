import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getVerifiedGuestReviewerSession, guestReviewerCookieName, isGuestReviewerSessionConfigured, signGuestReviewerSession } from '@/lib/guest-reviewer-session';

export async function POST(request: NextRequest) {
  if (!isGuestReviewerSessionConfigured()) return NextResponse.json({ error: 'Guest sessions are not configured.' }, { status: 503 });
  const body = await request.json() as { shareToken?: string; displayName?: string };
  const supabase = await createSupabaseServerClient();
  const { data, error } = supabase ? await supabase.rpc('create_guest_reviewer_session', { p_share_token: body.shareToken ?? '', p_display_name: body.displayName ?? '' }) : { data: null, error: new Error('Supabase is not configured.') };
  if (error || !data || typeof data !== 'object') return NextResponse.json({ error: 'Could not create guest session.' }, { status: 400 });
  const value = `${String(data.sessionId)}.${String(data.reviewId)}.${String(data.expiresAt)}`;
  const response = NextResponse.json({ displayName: data.displayName });
  response.cookies.set(guestReviewerCookieName, `${value}.${signGuestReviewerSession(value)}`, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return response;
}

export async function GET(request: NextRequest) {
  if (!isGuestReviewerSessionConfigured()) return NextResponse.json({ displayName: null });
  const token = request.nextUrl.searchParams.get('shareToken') ?? '';
  const supabase = await createSupabaseServerClient();
  const session = supabase ? await getVerifiedGuestReviewerSession(request, supabase, token) : null;
  return NextResponse.json({ displayName: session?.displayName ?? null });
}
