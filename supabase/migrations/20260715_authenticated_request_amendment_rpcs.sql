-- A client may amend or withdraw only their own untouched new Request.
create or replace function public.edit_authenticated_project_request(p_request_id text, p_title text, p_brief text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.project_requests q set title = trim(p_title), brief = trim(p_brief), updated_at = now(), last_activity_at = now()
  where q.id = p_request_id and q.requested_by_user_id = auth.uid() and q.status = 'new' and q.linked_review_id is null
    and not exists (select 1 from public.project_request_messages m where m.request_id = q.id and m.author_role = 'creator');
  if not found then raise exception 'This request can no longer be edited.'; end if;
end; $$;

create or replace function public.withdraw_authenticated_project_request(p_request_id text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.project_requests q set withdrawn_at = now(), updated_at = now(), last_activity_at = now()
  where q.id = p_request_id and q.requested_by_user_id = auth.uid() and q.status = 'new' and q.linked_review_id is null
    and not exists (select 1 from public.project_request_messages m where m.request_id = q.id and m.author_role = 'creator');
  if not found then raise exception 'This request can no longer be withdrawn.'; end if;
end; $$;

grant execute on function public.edit_authenticated_project_request(text, text, text) to authenticated;
grant execute on function public.withdraw_authenticated_project_request(text) to authenticated;
