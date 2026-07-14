-- Additive foundation for locked lifecycle, version publication, activity and PDF-page models.
alter table public.projects add column if not exists last_activity_at timestamptz not null default now();
alter table public.reviews add column if not exists lifecycle text not null default 'draft';
alter table public.reviews add column if not exists sharing_enabled boolean not null default true;
alter table public.reviews add column if not exists allow_replies boolean not null default true;
alter table public.reviews add column if not exists last_activity_at timestamptz not null default now();
alter table public.asset_versions add column if not exists publication_status text not null default 'draft';
alter table public.asset_versions add column if not exists published_at timestamptz;
alter table public.asset_versions add column if not exists withdrawn_at timestamptz;
alter table public.asset_versions add column if not exists review_round_id text;
alter table public.project_requests add column if not exists last_activity_at timestamptz not null default now();
alter table public.project_requests add column if not exists withdrawn_at timestamptz;

update public.reviews set lifecycle = case when status = 'draft' then 'draft' when status = 'archived' then 'archived' else 'open' end where lifecycle = 'draft';
update public.asset_versions set publication_status = case when coalesce(processing_status, status) in ('ready') then 'published' else 'draft' end where publication_status = 'draft';

alter table public.reviews drop constraint if exists reviews_lifecycle_check;
alter table public.reviews add constraint reviews_lifecycle_check check (lifecycle in ('draft','open','closed','archived'));
alter table public.asset_versions drop constraint if exists asset_versions_publication_status_check;
alter table public.asset_versions add constraint asset_versions_publication_status_check check (publication_status in ('draft','published','withdrawn'));

create table if not exists public.review_rounds (id text primary key, review_id text not null references public.reviews(id) on delete cascade, asset_id text references public.assets(id) on delete cascade, active_version_id text references public.asset_versions(id) on delete set null, purpose text not null default 'review', opened_at timestamptz not null default now(), closed_at timestamptz);
create table if not exists public.activity_events (id text primary key, project_id uuid references public.projects(id) on delete cascade, review_id text references public.reviews(id) on delete cascade, request_id text references public.project_requests(id) on delete cascade, asset_id text references public.assets(id) on delete set null, asset_version_id text references public.asset_versions(id) on delete set null, event_type text not null, source_id text, actor_role text, created_at timestamptz not null default now(), unique(event_type, source_id));
create table if not exists public.activity_reads (user_id uuid not null references auth.users(id) on delete cascade, scope_type text not null, scope_id text not null, last_seen_at timestamptz not null default now(), primary key(user_id, scope_type, scope_id));
create table if not exists public.asset_version_pages (id text primary key, asset_version_id text not null references public.asset_versions(id) on delete cascade, page_number integer not null, preview_storage_path text, thumbnail_storage_path text, width integer, height integer, processing_status text not null default 'idle', created_at timestamptz not null default now(), unique(asset_version_id, page_number));
create index if not exists activity_events_project_created_idx on public.activity_events(project_id, created_at desc);
create index if not exists activity_events_review_created_idx on public.activity_events(review_id, created_at desc);
