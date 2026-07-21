-- One active Project or one active standalone Review consumes a creator's
-- launch-plan capacity. Existing over-limit work is intentionally retained.
create or replace function public.active_work_limit_for_owner(p_owner_id uuid)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select 1;
$$;

create or replace function public.get_active_work_usage()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner_id uuid := auth.uid();
  v_active_projects integer := 0;
  v_active_standalone_reviews integer := 0;
  v_limit integer;
begin
  if v_owner_id is null then
    raise exception 'Sign in to view active-work usage.';
  end if;

  select count(*) into v_active_projects
  from public.projects
  where owner_id = v_owner_id and status = 'active';

  select count(*) into v_active_standalone_reviews
  from public.reviews
  where owner_id = v_owner_id
    and project_id is null
    and lifecycle = 'open';

  v_limit := public.active_work_limit_for_owner(v_owner_id);

  return jsonb_build_object(
    'activeProjects', v_active_projects,
    'activeStandaloneReviews', v_active_standalone_reviews,
    'totalActiveUnits', v_active_projects + v_active_standalone_reviews,
    'limit', v_limit,
    'overLimit', v_limit is not null and v_active_projects + v_active_standalone_reviews > v_limit
  );
end;
$$;

create or replace function public.enforce_active_project_capacity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_used integer;
  v_limit integer;
begin
  if new.status <> 'active' or (tg_op = 'UPDATE' and old.status = 'active') then
    return new;
  end if;

  v_limit := public.active_work_limit_for_owner(new.owner_id);
  if v_limit is null then return new; end if;

  select
    (select count(*) from public.projects p where p.owner_id = new.owner_id and p.status = 'active' and p.id <> new.id) +
    (select count(*) from public.reviews r where r.owner_id = new.owner_id and r.project_id is null and r.lifecycle = 'open')
  into v_used;

  if v_used >= v_limit then
    raise exception 'Active-work limit reached. Close or archive existing work before starting another active Project.';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_active_standalone_review_capacity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_used integer;
  v_limit integer;
begin
  if new.project_id is not null or new.lifecycle <> 'open' or
    (tg_op = 'UPDATE' and old.project_id is null and old.lifecycle = 'open') then
    return new;
  end if;

  v_limit := public.active_work_limit_for_owner(new.owner_id);
  if v_limit is null then return new; end if;

  select
    (select count(*) from public.projects p where p.owner_id = new.owner_id and p.status = 'active') +
    (select count(*) from public.reviews r where r.owner_id = new.owner_id and r.project_id is null and r.lifecycle = 'open' and r.id <> new.id)
  into v_used;

  if v_used >= v_limit then
    raise exception 'Active-work limit reached. Close or archive existing work before opening another standalone Review.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_active_project_capacity on public.projects;
create trigger enforce_active_project_capacity
before insert or update of status on public.projects
for each row execute function public.enforce_active_project_capacity();

drop trigger if exists enforce_active_standalone_review_capacity on public.reviews;
create trigger enforce_active_standalone_review_capacity
before insert or update of lifecycle, project_id on public.reviews
for each row execute function public.enforce_active_standalone_review_capacity();

revoke all on function public.active_work_limit_for_owner(uuid) from public;
revoke all on function public.enforce_active_project_capacity() from public;
revoke all on function public.enforce_active_standalone_review_capacity() from public;
grant execute on function public.get_active_work_usage() to authenticated;
