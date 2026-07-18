-- Guest Review writes receive their identity only through a verified server
-- session. These functions deliberately do not accept a display-name override.
create or replace function public.add_guest_shared_comment(
  p_share_token text, p_guest_session_id uuid, p_comment_id text, p_review_id text,
  p_asset_id text, p_asset_version_id text, p_parent_comment_id text, p_body text,
  p_x_percent numeric, p_y_percent numeric, p_page_number integer
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.reviews%rowtype; s public.guest_reviewer_sessions%rowtype;
begin
  select * into r from public.reviews where id = p_review_id and share_token = p_share_token and status not in ('draft', 'approved', 'archived') and allow_comments;
  if not found then raise exception 'Shared review is not accepting comments.'; end if;
  select * into s from public.guest_reviewer_sessions where id = p_guest_session_id and review_id = r.id and expires_at > now();
  if not found then raise exception 'Guest session is no longer available.'; end if;
  if p_asset_id is not null and not exists (select 1 from public.assets where id = p_asset_id and review_id = r.id) then raise exception 'Asset does not belong to shared review.'; end if;
  if p_asset_version_id is not null and not exists (select 1 from public.asset_versions where id = p_asset_version_id and review_id = r.id) then raise exception 'Asset version does not belong to shared review.'; end if;
  if p_parent_comment_id is not null and not exists (select 1 from public.comments where id = p_parent_comment_id and review_id = r.id) then raise exception 'Comment thread does not belong to shared review.'; end if;
  insert into public.comments(id, review_id, asset_id, asset_version_id, parent_comment_id, author_name, author_name_snapshot, guest_session_id, author_role, body, x_percent, y_percent, page_number, status)
  values (p_comment_id, r.id, p_asset_id, p_asset_version_id, p_parent_comment_id, s.display_name, s.display_name, s.id, 'reviewer', nullif(trim(p_body), ''), p_x_percent, p_y_percent, p_page_number, 'open');
end; $$;

create or replace function public.add_guest_shared_feedback(
  p_share_token text, p_guest_session_id uuid, p_feedback_id text, p_review_id text, p_body text
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.reviews%rowtype; s public.guest_reviewer_sessions%rowtype;
begin
  select * into r from public.reviews where id = p_review_id and share_token = p_share_token and status not in ('draft', 'approved', 'archived') and allow_comments;
  if not found then raise exception 'Shared review is not accepting feedback.'; end if;
  select * into s from public.guest_reviewer_sessions where id = p_guest_session_id and review_id = r.id and expires_at > now();
  if not found then raise exception 'Guest session is no longer available.'; end if;
  insert into public.review_feedback(id, review_id, reviewer_name, author_name_snapshot, guest_session_id, body)
  values (p_feedback_id, r.id, s.display_name, s.display_name, s.id, nullif(trim(p_body), ''));
end; $$;

create or replace function public.add_guest_shared_decision(
  p_share_token text, p_guest_session_id uuid, p_decision_id text, p_review_id text,
  p_asset_id text, p_asset_version_id text, p_type text, p_note text
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.reviews%rowtype; s public.guest_reviewer_sessions%rowtype;
begin
  select * into r from public.reviews where id = p_review_id and share_token = p_share_token and status not in ('draft', 'approved', 'archived') and allow_decisions;
  if not found then raise exception 'Shared review is not accepting decisions.'; end if;
  select * into s from public.guest_reviewer_sessions where id = p_guest_session_id and review_id = r.id and expires_at > now();
  if not found then raise exception 'Guest session is no longer available.'; end if;
  if not exists (select 1 from public.assets where id = p_asset_id and review_id = r.id) then raise exception 'Deliverable does not belong to shared review.'; end if;
  if p_asset_version_id is not null and not exists (select 1 from public.asset_versions where id = p_asset_version_id and asset_id = p_asset_id and review_id = r.id) then raise exception 'Version does not belong to deliverable.'; end if;
  insert into public.decisions(id, review_id, asset_id, asset_version_id, reviewer_name, author_name_snapshot, guest_session_id, type, note)
  values (p_decision_id, r.id, p_asset_id, p_asset_version_id, s.display_name, s.display_name, s.id, p_type, coalesce(p_note, ''));
end; $$;

grant execute on function public.add_guest_shared_comment(text, uuid, text, text, text, text, text, text, numeric, numeric, integer) to anon, authenticated;
grant execute on function public.add_guest_shared_feedback(text, uuid, text, text, text) to anon, authenticated;
grant execute on function public.add_guest_shared_decision(text, uuid, text, text, text, text, text, text) to anon, authenticated;
