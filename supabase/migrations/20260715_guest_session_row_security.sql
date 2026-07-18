-- Guest session rows contain identity metadata and must never be readable as a
-- public table. The application resolves an already-signed cookie through this
-- minimal RPC instead.
alter table public.guest_reviewer_sessions enable row level security;

drop policy if exists "Creators read guest reviewer sessions" on public.guest_reviewer_sessions;
create policy "Creators read guest reviewer sessions" on public.guest_reviewer_sessions
  for select using (exists (
    select 1 from public.reviews r
    where r.id = guest_reviewer_sessions.review_id and r.owner_id = auth.uid()
  ));

create or replace function public.get_guest_reviewer_session(p_session_id uuid, p_review_id text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare s public.guest_reviewer_sessions%rowtype;
begin
  select * into s from public.guest_reviewer_sessions
  where id = p_session_id and review_id = p_review_id and expires_at > now();
  if not found then return null; end if;
  return jsonb_build_object('sessionId', s.id, 'reviewId', s.review_id, 'displayName', s.display_name, 'expiresAt', s.expires_at);
end; $$;

grant execute on function public.get_guest_reviewer_session(uuid, text) to anon, authenticated;
