-- Authenticated client portal foundation. Legacy Project bearer links remain
-- untouched for compatibility until the client routes take over.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  studio_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.profiles (user_id, display_name)
select u.id, coalesce(nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(u.email, ''), '@', 1), 'WizerView user')
from auth.users u
on conflict (user_id) do nothing;

create or replace function public.handle_new_profile()
returns trigger language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  insert into public.profiles(user_id, display_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(new.email, ''), '@', 1), 'WizerView user'))
  on conflict (user_id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users
for each row execute procedure public.handle_new_profile();

create table if not exists public.project_client_memberships (
  id uuid primary key default extensions.gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'active', 'revoked')),
  invited_email text,
  invited_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, user_id)
);

create table if not exists public.project_client_invitations (
  id uuid primary key default extensions.gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email_normalized text not null,
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null default now() + interval '7 days',
  invited_by_user_id uuid not null references auth.users(id) on delete restrict,
  accepted_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  last_sent_at timestamptz not null default now()
);

create index if not exists project_client_memberships_project_active_idx on public.project_client_memberships(project_id, user_id) where status = 'active';
create index if not exists project_client_memberships_user_active_idx on public.project_client_memberships(user_id, project_id) where status = 'active';
create index if not exists project_client_invitations_project_status_idx on public.project_client_invitations(project_id, status, created_at desc);
create index if not exists project_client_invitations_email_idx on public.project_client_invitations(email_normalized, status);

alter table public.profiles enable row level security;
alter table public.project_client_memberships enable row level security;
alter table public.project_client_invitations enable row level security;

create or replace function public.is_project_owner(p_project_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.projects p where p.id = p_project_id and p.owner_id = p_user_id);
$$;

create or replace function public.is_active_project_client(p_project_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.project_client_memberships m where m.project_id = p_project_id and m.user_id = p_user_id and m.status = 'active');
$$;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles for select using (auth.uid() = user_id);
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Owners manage client memberships" on public.project_client_memberships;
create policy "Owners manage client memberships" on public.project_client_memberships for all
using (public.is_project_owner(project_id))
with check (public.is_project_owner(project_id));
drop policy if exists "Clients read own memberships" on public.project_client_memberships;
create policy "Clients read own memberships" on public.project_client_memberships for select using (auth.uid() = user_id);

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
  client_visible and lifecycle in ('open', 'closed') and project_id is not null and
  public.is_active_project_client(project_id)
);

create or replace function public.create_project_client_invitation(p_project_id uuid, p_email text, p_raw_token text)
returns uuid language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_id uuid; v_email text := lower(trim(p_email));
begin
  if auth.uid() is null or not exists (select 1 from public.projects where id = p_project_id and owner_id = auth.uid()) then raise exception 'Project not found.'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$' then raise exception 'Enter a valid email address.'; end if;
  if char_length(p_raw_token) < 32 then raise exception 'Invalid invitation token.'; end if;
  update public.project_client_invitations set status = 'revoked', revoked_at = now()
  where project_id = p_project_id and email_normalized = v_email and status = 'pending';
  insert into public.project_client_invitations(project_id, email_normalized, token_hash, invited_by_user_id)
  values (p_project_id, v_email, extensions.encode(extensions.digest(p_raw_token, 'sha256'), 'hex'), auth.uid()) returning id into v_id;
  return v_id;
end; $$;

create or replace function public.accept_project_client_invitation(p_raw_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_inv public.project_client_invitations%rowtype; v_email text; v_profile_name text;
begin
  if auth.uid() is null then raise exception 'Sign in to accept this invitation.'; end if;
  select lower(email) into v_email from auth.users where id = auth.uid();
  select * into v_inv from public.project_client_invitations where token_hash = extensions.encode(extensions.digest(p_raw_token, 'sha256'), 'hex') for update;
  if not found or v_inv.status <> 'pending' or v_inv.expires_at <= now() then raise exception 'This invitation is no longer available.'; end if;
  if v_inv.email_normalized <> v_email then raise exception 'This invitation was sent to another email address.'; end if;
  insert into public.profiles(user_id, display_name) values (auth.uid(), split_part(v_email, '@', 1)) on conflict (user_id) do nothing;
  insert into public.project_client_memberships(project_id, user_id, status, invited_email, invited_at, accepted_at)
  values (v_inv.project_id, auth.uid(), 'active', v_inv.email_normalized, v_inv.created_at, now())
  on conflict (project_id, user_id) do update set status = 'active', accepted_at = now(), revoked_at = null, updated_at = now();
  update public.project_client_invitations set status = 'accepted', accepted_by_user_id = auth.uid(), accepted_at = now() where id = v_inv.id;
  select display_name into v_profile_name from public.profiles where user_id = auth.uid();
  return jsonb_build_object('projectId', v_inv.project_id, 'displayName', v_profile_name);
end; $$;

create or replace function public.revoke_project_client_invitation(p_invitation_id uuid)
returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  update public.project_client_invitations i set status = 'revoked', revoked_at = now()
  from public.projects p where i.id = p_invitation_id and p.id = i.project_id and p.owner_id = auth.uid() and i.status = 'pending';
  if not found then raise exception 'Invitation not found.'; end if;
end; $$;

create or replace function public.revoke_project_client_membership(p_membership_id uuid)
returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  update public.project_client_memberships m set status = 'revoked', revoked_at = now(), updated_at = now()
  from public.projects p where m.id = p_membership_id and p.id = m.project_id and p.owner_id = auth.uid() and m.status <> 'revoked';
  if not found then raise exception 'Membership not found.'; end if;
end; $$;

grant execute on function public.create_project_client_invitation(uuid, text, text) to authenticated;
grant execute on function public.accept_project_client_invitation(text) to authenticated;
grant execute on function public.revoke_project_client_invitation(uuid) to authenticated;
grant execute on function public.revoke_project_client_membership(uuid) to authenticated;
grant execute on function public.is_project_owner(uuid, uuid) to anon, authenticated;
grant execute on function public.is_active_project_client(uuid, uuid) to anon, authenticated;
