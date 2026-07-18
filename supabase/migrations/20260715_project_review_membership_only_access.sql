-- Project Reviews belong to the authenticated client portal. Standalone
-- Reviews retain their deliberate guest-link flow.
update public.reviews
set standalone_sharing_enabled = false
where project_id is not null and standalone_sharing_enabled;

create or replace function public.sync_review_standalone_sharing_scope()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.project_id is not null and (tg_op = 'INSERT' or old.project_id is distinct from new.project_id) then
    new.standalone_sharing_enabled := false;
  end if;
  return new;
end; $$;

drop trigger if exists sync_review_standalone_sharing_scope on public.reviews;
create trigger sync_review_standalone_sharing_scope
before insert or update of project_id on public.reviews
for each row execute function public.sync_review_standalone_sharing_scope();

create or replace function public.resolve_review_access(p_share_token text, p_access_code text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare r public.reviews%rowtype; v_user_id uuid := auth.uid(); v_membership_id uuid;
begin
  select * into r from public.reviews
  where share_token = p_share_token and sharing_enabled and lifecycle in ('open', 'closed');
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

  if not r.standalone_sharing_enabled then return jsonb_build_object('mode', 'denied'); end if;
  if r.standalone_access_code_hash is not null and (p_access_code is null or extensions.crypt(p_access_code, r.standalone_access_code_hash) <> r.standalone_access_code_hash) then
    return jsonb_build_object('mode', 'denied', 'requiresAccessCode', true);
  end if;

  if v_user_id is not null then
    return jsonb_build_object('mode', 'authenticated_standalone', 'reviewId', r.id, 'projectId', r.project_id);
  end if;
  return jsonb_build_object('mode', 'guest', 'reviewId', r.id, 'projectId', r.project_id, 'requiresName', r.reviewer_name_required);
end; $$;

-- Retire bearer Project payloads. The token is retained only to guide the
-- recipient into the authenticated client portal without revealing Project data.
create or replace function public.get_shared_project(p_share_token text, p_access_code text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from public.projects where share_token = p_share_token and archived_at is null and sharing_enabled) then return null; end if;
  return jsonb_build_object('requiresAuthentication', true);
end; $$;

grant execute on function public.resolve_review_access(text, text) to anon, authenticated;
grant execute on function public.get_shared_project(text, text) to anon, authenticated;
