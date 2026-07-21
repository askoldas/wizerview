-- Creator-only access to project Requests. Client access remains RPC-only.
alter table public.project_requests enable row level security;
alter table public.project_request_references enable row level security;
alter table public.project_request_messages enable row level security;

drop policy if exists "Creators manage project requests" on public.project_requests;
create policy "Creators manage project requests" on public.project_requests
  for all
  using (exists (
    select 1 from public.projects p
    where p.id = project_requests.project_id and p.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = project_requests.project_id and p.owner_id = auth.uid()
  ));

drop policy if exists "Creators manage project request references" on public.project_request_references;
create policy "Creators manage project request references" on public.project_request_references
  for all
  using (exists (
    select 1
    from public.project_requests q
    join public.projects p on p.id = q.project_id
    where q.id = project_request_references.request_id and p.owner_id = auth.uid()
  ))
  with check (exists (
    select 1
    from public.project_requests q
    join public.projects p on p.id = q.project_id
    where q.id = project_request_references.request_id and p.owner_id = auth.uid()
  ));

drop policy if exists "Creators manage project request messages" on public.project_request_messages;
create policy "Creators manage project request messages" on public.project_request_messages
  for all
  using (exists (
    select 1
    from public.project_requests q
    join public.projects p on p.id = q.project_id
    where q.id = project_request_messages.request_id and p.owner_id = auth.uid()
  ))
  with check (exists (
    select 1
    from public.project_requests q
    join public.projects p on p.id = q.project_id
    where q.id = project_request_messages.request_id and p.owner_id = auth.uid()
  ));
