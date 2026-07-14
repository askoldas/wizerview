-- Optional project access codes. Codes are hashed in Postgres and never exposed in shared payloads.
drop function if exists public.get_shared_project(text);

create or replace function public.get_shared_project(p_share_token text, p_access_code text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare p public.projects%rowtype;
begin
  select * into p from public.projects where share_token = p_share_token and archived_at is null and sharing_enabled;
  if not found then return null; end if;
  if p.access_code_hash is not null and (p_access_code is null or crypt(p_access_code, p.access_code_hash) <> p.access_code_hash) then
    return jsonb_build_object('requiresAccessCode', true);
  end if;
  return jsonb_build_object(
    'title', p.name, 'client', coalesce(p.client_name, ''), 'description', p.description,
    'reviews', coalesce((select jsonb_agg(jsonb_build_object('title', r.title, 'status', r.status, 'shareToken', r.share_token, 'updatedAt', r.updated_at, 'deliverableCount', (select count(*) from public.assets a where a.review_id = r.id), 'openCommentCount', (select count(*) from public.comments c where c.review_id = r.id and c.parent_comment_id is null and c.status = 'open')) order by r.updated_at desc) from public.reviews r where r.project_id = p.id and r.client_visible and r.status not in ('draft','archived')), '[]'::jsonb),
    'requests', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'title', q.title, 'status', q.status, 'requestedByName', q.requested_by_name, 'linkedReviewShareToken', r.share_token, 'updatedAt', q.updated_at, 'messageCount', (select count(*) from public.project_request_messages m where m.request_id = q.id)) order by q.updated_at desc) from public.project_requests q left join public.reviews r on r.id = q.linked_review_id where q.project_id = p.id and q.client_visible), '[]'::jsonb),
    'allowClientRequests', p.allow_client_requests
  );
end; $$;

create or replace function public.set_project_access_code(p_project_id uuid, p_access_code text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from public.projects where id = p_project_id and owner_id = auth.uid()) then raise exception 'Project not found.'; end if;
  if nullif(trim(coalesce(p_access_code, '')), '') is not null and char_length(trim(p_access_code)) < 6 then raise exception 'Access code must be at least 6 characters.'; end if;
  update public.projects set access_code_hash = case when nullif(trim(coalesce(p_access_code, '')), '') is null then null else crypt(trim(p_access_code), gen_salt('bf')) end, access_code_version = access_code_version + 1, updated_at = now() where id = p_project_id;
end; $$;

grant execute on function public.get_shared_project(text, text) to anon, authenticated;
grant execute on function public.set_project_access_code(uuid, text) to authenticated;
