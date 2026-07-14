-- Ensure direct Request URLs and writes cannot bypass a protected project code.
drop function if exists public.get_shared_project_request(text, text);
drop function if exists public.add_shared_project_request_message(text, text, text, text, text);
drop function if exists public.add_shared_project_request_link(text, text, text, text, text, text, text);

create or replace function public.get_shared_project_request(p_share_token text, p_request_id text, p_access_code text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare p public.projects%rowtype; q public.project_requests%rowtype;
begin
  select * into p from public.projects where share_token = p_share_token and archived_at is null and sharing_enabled;
  if not found or (p.access_code_hash is not null and (p_access_code is null or crypt(p_access_code, p.access_code_hash) <> p.access_code_hash)) then return null; end if;
  select * into q from public.project_requests where id = p_request_id and project_id = p.id and client_visible;
  if not found then return null; end if;
  return jsonb_build_object('projectTitle', p.name, 'request', jsonb_build_object('id', q.id, 'title', q.title, 'brief', q.brief, 'status', q.status, 'requestedByName', q.requested_by_name, 'updatedAt', q.updated_at), 'references', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'type', x.reference_type, 'title', x.title, 'url', x.url, 'note', x.note, 'createdByRole', x.created_by_role, 'createdByName', x.created_by_name) order by x.sort_order, x.created_at) from public.project_request_references x where x.request_id = q.id), '[]'::jsonb), 'messages', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'authorRole', m.author_role, 'authorName', m.author_name, 'body', m.body, 'createdAt', m.created_at) order by m.created_at) from public.project_request_messages m where m.request_id = q.id), '[]'::jsonb), 'allowClientRequestReplies', p.allow_client_request_replies, 'allowClientRequestReferences', p.allow_client_request_references);
end; $$;

create or replace function public.add_shared_project_request_message(p_share_token text, p_request_id text, p_access_code text, p_message_id text, p_author_name text, p_body text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare p public.projects%rowtype; q public.project_requests%rowtype;
begin
  select * into p from public.projects where share_token = p_share_token and archived_at is null and sharing_enabled and allow_client_request_replies;
  if not found or (p.access_code_hash is not null and (p_access_code is null or crypt(p_access_code, p.access_code_hash) <> p.access_code_hash)) then raise exception 'This request is not available.'; end if;
  select * into q from public.project_requests where id = p_request_id and project_id = p.id and client_visible;
  if not found or q.status in ('closed', 'declined') or char_length(trim(p_body)) not between 1 and 3000 then raise exception 'Invalid reply.'; end if;
  insert into public.project_request_messages(id, request_id, author_role, author_name, body) values (p_message_id, q.id, 'client', nullif(trim(p_author_name), ''), trim(p_body)); update public.project_requests set updated_at = now() where id = q.id;
end; $$;

create or replace function public.add_shared_project_request_link(p_share_token text, p_request_id text, p_access_code text, p_reference_id text, p_author_name text, p_title text, p_url text, p_note text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare p public.projects%rowtype; q public.project_requests%rowtype;
begin
  select * into p from public.projects where share_token = p_share_token and archived_at is null and sharing_enabled and allow_client_request_references;
  if not found or (p.access_code_hash is not null and (p_access_code is null or crypt(p_access_code, p.access_code_hash) <> p.access_code_hash)) then raise exception 'This request is not available.'; end if;
  select * into q from public.project_requests where id = p_request_id and project_id = p.id and client_visible;
  if not found or q.status in ('closed', 'declined') or char_length(trim(p_url)) not between 1 and 2000 then raise exception 'Invalid link.'; end if;
  insert into public.project_request_references(id, request_id, reference_type, title, url, note, created_by_role, created_by_name, sort_order) values (p_reference_id, q.id, 'link', nullif(trim(p_title), ''), trim(p_url), nullif(trim(p_note), ''), 'client', nullif(trim(p_author_name), ''), (select count(*) from public.project_request_references where request_id = q.id)); update public.project_requests set updated_at = now() where id = q.id;
end; $$;

grant execute on function public.get_shared_project_request(text, text, text) to anon, authenticated;
grant execute on function public.add_shared_project_request_message(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.add_shared_project_request_link(text, text, text, text, text, text, text, text) to anon, authenticated;
