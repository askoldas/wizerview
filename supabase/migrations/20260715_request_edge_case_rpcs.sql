-- Client may amend or withdraw only an untouched new Request; creator links must stay in Project.
create or replace function public.edit_shared_project_request(p_share_token text, p_request_id text, p_reviewer_name text, p_title text, p_brief text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare p public.projects%rowtype; q public.project_requests%rowtype;
begin
  select * into p from public.projects where share_token = p_share_token and sharing_enabled and archived_at is null;
  select * into q from public.project_requests where id = p_request_id and project_id = p.id and status = 'new' and linked_review_id is null;
  if not found or exists (select 1 from public.project_request_messages where request_id = p_request_id and author_role = 'creator') then raise exception 'This request can no longer be edited.'; end if;
  update public.project_requests set title = trim(p_title), brief = trim(p_brief), requested_by_name = nullif(trim(p_reviewer_name), ''), updated_at = now(), last_activity_at = now() where id = q.id;
end; $$;

create or replace function public.withdraw_shared_project_request(p_share_token text, p_request_id text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.project_requests q set withdrawn_at = now(), updated_at = now(), last_activity_at = now()
  from public.projects p where q.id = p_request_id and q.project_id = p.id and p.share_token = p_share_token and p.sharing_enabled and q.status = 'new' and q.linked_review_id is null and not exists (select 1 from public.project_request_messages m where m.request_id = q.id and m.author_role = 'creator');
  if not found then raise exception 'This request can no longer be withdrawn.'; end if;
end; $$;

create or replace function public.link_project_request_review(p_request_id text, p_review_id text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from public.project_requests q join public.projects p on p.id = q.project_id join public.reviews r on r.id = p_review_id where q.id = p_request_id and p.owner_id = auth.uid() and r.project_id = p.id) then raise exception 'Review must belong to the same Project.'; end if;
  update public.project_requests set linked_review_id = p_review_id, status = 'in_progress', updated_at = now(), last_activity_at = now() where id = p_request_id;
end; $$;
grant execute on function public.edit_shared_project_request(text, text, text, text, text) to anon, authenticated;
grant execute on function public.withdraw_shared_project_request(text, text) to anon, authenticated;
grant execute on function public.link_project_request_review(text, text) to authenticated;
