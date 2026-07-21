-- Guest identity is created only for a valid standalone Review token.
create or replace function public.create_guest_reviewer_session(p_share_token text, p_display_name text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare r public.reviews%rowtype; v_id uuid;
begin
  if char_length(trim(p_display_name)) not between 1 and 120 then raise exception 'Enter your name.'; end if;
  select * into r from public.reviews where share_token = p_share_token and standalone_sharing_enabled and sharing_enabled and lifecycle in ('open', 'closed');
  if not found then raise exception 'Review is not available.'; end if;
  insert into public.guest_reviewer_sessions(review_id, display_name) values (r.id, trim(p_display_name)) returning id into v_id;
  return jsonb_build_object('sessionId', v_id, 'reviewId', r.id, 'displayName', trim(p_display_name), 'expiresAt', now() + interval '30 days');
end; $$;
grant execute on function public.create_guest_reviewer_session(text, text) to anon, authenticated;
