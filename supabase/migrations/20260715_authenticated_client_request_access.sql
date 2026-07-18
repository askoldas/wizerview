-- Project Requests and References are no longer writable through a bearer link.
-- Active Project membership is required at every database operation.
create or replace function public.sync_review_project_visibility()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  new.visible_in_project := new.client_visible;
  return new;
end; $$;

drop trigger if exists sync_review_project_visibility on public.reviews;
create trigger sync_review_project_visibility
before insert or update of client_visible on public.reviews
for each row execute function public.sync_review_project_visibility();

drop policy if exists "Clients read project requests" on public.project_requests;
create policy "Clients read project requests" on public.project_requests for select using (
  client_visible and withdrawn_at is null and exists (
    select 1 from public.project_client_memberships m
    where m.project_id = project_requests.project_id and m.user_id = auth.uid() and m.status = 'active'
  )
);
drop policy if exists "Clients create project requests" on public.project_requests;
create policy "Clients create project requests" on public.project_requests for insert with check (
  client_visible and exists (
    select 1 from public.project_client_memberships m
    where m.project_id = project_requests.project_id and m.user_id = auth.uid() and m.status = 'active'
  )
);

drop policy if exists "Clients read request references" on public.project_request_references;
create policy "Clients read request references" on public.project_request_references for select using (exists (
  select 1 from public.project_requests q join public.project_client_memberships m on m.project_id = q.project_id
  where q.id = project_request_references.request_id and q.client_visible and q.withdrawn_at is null and m.user_id = auth.uid() and m.status = 'active'
));
drop policy if exists "Clients add request links" on public.project_request_references;
create policy "Clients add request links" on public.project_request_references for insert with check (
  reference_type = 'link' and created_by_role = 'client' and exists (
    select 1 from public.project_requests q join public.project_client_memberships m on m.project_id = q.project_id
    where q.id = project_request_references.request_id and q.client_visible and q.status not in ('closed', 'declined') and m.user_id = auth.uid() and m.status = 'active'
  )
);

drop policy if exists "Clients read request messages" on public.project_request_messages;
create policy "Clients read request messages" on public.project_request_messages for select using (exists (
  select 1 from public.project_requests q join public.project_client_memberships m on m.project_id = q.project_id
  where q.id = project_request_messages.request_id and q.client_visible and q.withdrawn_at is null and m.user_id = auth.uid() and m.status = 'active'
));
drop policy if exists "Clients add request messages" on public.project_request_messages;
create policy "Clients add request messages" on public.project_request_messages for insert with check (
  author_role = 'client' and exists (
    select 1 from public.project_requests q join public.project_client_memberships m on m.project_id = q.project_id
    where q.id = project_request_messages.request_id and q.client_visible and q.status not in ('closed', 'declined') and m.user_id = auth.uid() and m.status = 'active'
  )
);

-- Legacy Project links may remain read-only temporarily, but can no longer
-- create or change Requests, messages, or references.
revoke execute on function public.add_shared_project_request(text, text, text, text, text) from anon, authenticated;
revoke execute on function public.add_shared_project_request_message(text, text, text, text, text, text) from anon, authenticated;
revoke execute on function public.add_shared_project_request_link(text, text, text, text, text, text, text, text) from anon, authenticated;
