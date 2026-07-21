-- A creator can identify the clients they invited to their own Project, but no
-- other profile rows become visible.
drop policy if exists "Project owners read client profiles" on public.profiles;
create policy "Project owners read client profiles" on public.profiles for select using (
  exists (
    select 1
    from public.project_client_memberships m
    join public.projects p on p.id = m.project_id
    where m.user_id = profiles.user_id and p.owner_id = auth.uid()
  )
);
