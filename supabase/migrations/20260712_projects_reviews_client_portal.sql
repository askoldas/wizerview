-- Project / Review hierarchy migration. Apply after the existing schema.sql.
-- This migration is deliberately additive: existing review ids and share links remain valid.

alter table public.projects add column if not exists description text not null default '';
alter table public.projects add column if not exists status text not null default 'active';
alter table public.projects add column if not exists share_token text unique default encode(gen_random_bytes(24), 'hex');
alter table public.projects add column if not exists archived_at timestamptz;

alter table public.reviews add column if not exists review_goal text not null default 'approve';
alter table public.reviews add column if not exists client_visible boolean not null default false;

create unique index if not exists projects_share_token_key on public.projects (share_token);
create index if not exists reviews_project_id_updated_at_idx on public.reviews (project_id, updated_at desc);

-- Backfill standalone reviews into one safe project per creator. Reviews without an owner
-- are intentionally left untouched for manual recovery rather than being exposed publicly.
insert into public.projects (owner_id, name, client_name, description)
select distinct r.owner_id, 'Imported Reviews', null, 'Created automatically for existing standalone reviews.'
from public.reviews r
where r.project_id is null and r.owner_id is not null
  and not exists (
    select 1 from public.projects p
    where p.owner_id = r.owner_id and p.name = 'Imported Reviews'
  );

update public.reviews r
set project_id = p.id
from public.projects p
where r.project_id is null
  and r.owner_id = p.owner_id
  and p.name = 'Imported Reviews';

-- A project link exposes only reviews explicitly made client-visible and never drafts.
create or replace function public.get_shared_project(p_share_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  project_row public.projects%rowtype;
begin
  select * into project_row
  from public.projects
  where share_token = p_share_token and archived_at is null;

  if not found then return null; end if;

  return jsonb_build_object(
    'title', project_row.name,
    'client', coalesce(project_row.client_name, ''),
    'description', project_row.description,
    'reviews', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', r.title,
        'status', r.status,
        'shareToken', r.share_token,
        'updatedAt', r.updated_at,
        'deliverableCount', (select count(*) from public.assets a where a.review_id = r.id),
        'openCommentCount', (select count(*) from public.comments c where c.review_id = r.id and c.parent_comment_id is null and c.status = 'open')
      ) order by r.updated_at desc)
      from public.reviews r
      where r.project_id = project_row.id
        and r.client_visible
        and r.status not in ('draft', 'archived')
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_shared_project(text) to anon, authenticated;
