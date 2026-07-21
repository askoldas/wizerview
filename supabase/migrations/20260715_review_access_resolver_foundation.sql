-- Explicit Review visibility plus a server-authoritative access resolver.
-- Existing Review links remain standalone-enabled for compatibility.
create extension if not exists pgcrypto with schema extensions;

alter table public.reviews add column if not exists visible_in_project boolean not null default false;
alter table public.reviews add column if not exists standalone_sharing_enabled boolean not null default true;
alter table public.reviews add column if not exists standalone_access_code_hash text;

update public.reviews
set visible_in_project = client_visible
where visible_in_project = false and client_visible = true;

create index if not exists reviews_project_visible_client_idx
  on public.reviews(project_id, updated_at desc)
  where visible_in_project and lifecycle in ('open', 'closed');

create or replace function public.resolve_review_access(p_share_token text, p_access_code text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare r public.reviews%rowtype; v_user_id uuid := auth.uid(); v_membership_id uuid;
begin
  select * into r from public.reviews
  where share_token = p_share_token and standalone_sharing_enabled and sharing_enabled and lifecycle in ('open', 'closed');
  if not found then return jsonb_build_object('mode', 'denied'); end if;

  if v_user_id is not null and r.owner_id = v_user_id then
    return jsonb_build_object('mode', 'creator', 'reviewId', r.id, 'projectId', r.project_id);
  end if;

  if v_user_id is not null and r.project_id is not null and r.visible_in_project then
    select id into v_membership_id from public.project_client_memberships
    where project_id = r.project_id and user_id = v_user_id and status = 'active';
    if found then
      return jsonb_build_object('mode', 'authenticated_project_client', 'reviewId', r.id, 'projectId', r.project_id, 'membershipId', v_membership_id);
    end if;
  end if;

  if r.standalone_access_code_hash is not null and (p_access_code is null or extensions.crypt(p_access_code, r.standalone_access_code_hash) <> r.standalone_access_code_hash) then
    return jsonb_build_object('mode', 'denied', 'requiresAccessCode', true);
  end if;

  if v_user_id is not null then
    return jsonb_build_object('mode', 'authenticated_standalone', 'reviewId', r.id, 'projectId', r.project_id);
  end if;
  return jsonb_build_object('mode', 'guest', 'reviewId', r.id, 'projectId', r.project_id, 'requiresName', r.reviewer_name_required);
end; $$;

create or replace function public.set_review_standalone_access_code(p_review_id text, p_access_code text)
returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if not exists (select 1 from public.reviews where id = p_review_id and owner_id = auth.uid()) then raise exception 'Review not found.'; end if;
  if nullif(trim(coalesce(p_access_code, '')), '') is not null and char_length(trim(p_access_code)) < 6 then raise exception 'Access code must be at least 6 characters.'; end if;
  update public.reviews set standalone_access_code_hash = case when nullif(trim(coalesce(p_access_code, '')), '') is null then null else extensions.crypt(trim(p_access_code), extensions.gen_salt('bf')) end, updated_at = now() where id = p_review_id;
end; $$;

grant execute on function public.resolve_review_access(text, text) to anon, authenticated;
grant execute on function public.set_review_standalone_access_code(text, text) to authenticated;
