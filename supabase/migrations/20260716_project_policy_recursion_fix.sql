-- Avoid recursive RLS evaluation between projects and client memberships.
-- Project policies need to test membership without reading the membership table
-- through its own policies, and membership policies need the same for ownership.

create or replace function public.is_project_owner(p_project_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.owner_id = p_user_id
  );
$$;

create or replace function public.is_active_project_client(p_project_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.project_client_memberships m
    where m.project_id = p_project_id
      and m.user_id = p_user_id
      and m.status = 'active'
  );
$$;

drop policy if exists "Owners manage client memberships" on public.project_client_memberships;
create policy "Owners manage client memberships" on public.project_client_memberships for all
using (public.is_project_owner(project_id))
with check (public.is_project_owner(project_id));

drop policy if exists "Owners manage project invitations" on public.project_client_invitations;
create policy "Owners manage project invitations" on public.project_client_invitations for all
using (public.is_project_owner(project_id))
with check (public.is_project_owner(project_id));

drop policy if exists "Clients read member projects" on public.projects;
create policy "Clients read member projects" on public.projects for select using (
  public.is_active_project_client(id)
);

drop policy if exists "Clients read visible project reviews" on public.reviews;
create policy "Clients read visible project reviews" on public.reviews for select using (
  client_visible
  and lifecycle in ('open', 'closed')
  and project_id is not null
  and public.is_active_project_client(project_id)
);

grant execute on function public.is_project_owner(uuid, uuid) to anon, authenticated;
grant execute on function public.is_active_project_client(uuid, uuid) to anon, authenticated;
