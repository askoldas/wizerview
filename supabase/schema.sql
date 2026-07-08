create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  client_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id text primary key,
  project_id uuid references public.projects(id) on delete set null,
  owner_id uuid references auth.users(id) on delete cascade,
  title text not null default 'Untitled review',
  client_name text,
  instructions text not null default '',
  status text not null default 'draft' check (status in ('draft', 'in_review', 'changes_requested', 'direction_selected', 'approved', 'archived')),
  share_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  reviewer_name_required boolean not null default true,
  pin_protection_enabled boolean not null default false,
  allow_comments boolean not null default true,
  allow_decisions boolean not null default true,
  content jsonb not null default '{}'::jsonb,
  creator_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reviews add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.reviews add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.reviews add column if not exists title text not null default 'Untitled review';
alter table public.reviews add column if not exists client_name text;
alter table public.reviews add column if not exists instructions text not null default '';
alter table public.reviews add column if not exists status text not null default 'draft';
alter table public.reviews add column if not exists share_token text not null default encode(gen_random_bytes(24), 'hex');
alter table public.reviews add column if not exists reviewer_name_required boolean not null default true;
alter table public.reviews add column if not exists pin_protection_enabled boolean not null default false;
alter table public.reviews add column if not exists allow_comments boolean not null default true;
alter table public.reviews add column if not exists allow_decisions boolean not null default true;
alter table public.reviews add column if not exists content jsonb not null default '{}'::jsonb;
alter table public.reviews add column if not exists creator_seen_at timestamptz;
alter table public.reviews add column if not exists created_at timestamptz not null default now();
alter table public.reviews add column if not exists updated_at timestamptz not null default now();

create unique index if not exists reviews_share_token_key on public.reviews (share_token);

create table if not exists public.review_options (
  id text primary key,
  review_id text not null references public.reviews(id) on delete cascade,
  title text not null,
  description text not null default '',
  feedback text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.review_options add column if not exists review_id text references public.reviews(id) on delete cascade;
alter table public.review_options add column if not exists title text not null default 'Option';
alter table public.review_options add column if not exists description text not null default '';
alter table public.review_options add column if not exists feedback text not null default '';
alter table public.review_options add column if not exists sort_order integer not null default 0;
alter table public.review_options add column if not exists created_at timestamptz not null default now();

create table if not exists public.assets (
  id text primary key,
  review_id text not null references public.reviews(id) on delete cascade,
  option_id text references public.review_options(id) on delete cascade,
  type text not null check (type in ('image', 'screenshot', 'pdf', 'pdf_page')),
  title text not null,
  description text not null default '',
  original_name text,
  original_mime_type text,
  original_bytes bigint,
  preview_mime_type text,
  preview_bytes bigint,
  storage_path text,
  thumbnail_storage_path text,
  width integer,
  height integer,
  page_number integer,
  page_count integer,
  processing_status text not null default 'idle' check (processing_status in ('idle', 'uploading', 'processing', 'ready', 'failed')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.assets add column if not exists review_id text references public.reviews(id) on delete cascade;
alter table public.assets add column if not exists option_id text references public.review_options(id) on delete cascade;
alter table public.assets add column if not exists type text not null default 'screenshot';
alter table public.assets add column if not exists title text not null default 'Asset';
alter table public.assets add column if not exists description text not null default '';
alter table public.assets add column if not exists original_name text;
alter table public.assets add column if not exists original_mime_type text;
alter table public.assets add column if not exists original_bytes bigint;
alter table public.assets add column if not exists preview_mime_type text;
alter table public.assets add column if not exists preview_bytes bigint;
alter table public.assets add column if not exists storage_path text;
alter table public.assets add column if not exists thumbnail_storage_path text;
alter table public.assets add column if not exists width integer;
alter table public.assets add column if not exists height integer;
alter table public.assets add column if not exists page_number integer;
alter table public.assets add column if not exists page_count integer;
alter table public.assets add column if not exists processing_status text not null default 'idle';
alter table public.assets add column if not exists sort_order integer not null default 0;
alter table public.assets add column if not exists created_at timestamptz not null default now();
alter table public.assets add column if not exists asset_type text;
alter table public.assets add column if not exists status text;
alter table public.assets add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.assets add column if not exists updated_at timestamptz not null default now();

create table if not exists public.asset_versions (
  id text primary key default gen_random_uuid()::text,
  review_id text not null references public.reviews(id) on delete cascade,
  asset_id text not null references public.assets(id) on delete cascade,
  label text not null,
  version_number integer not null default 1,
  sort_order integer not null default 0,
  source_url text,
  preview_url text,
  thumbnail_url text,
  storage_path text,
  mime_type text,
  width integer,
  height integer,
  page_count integer,
  preview_bytes bigint,
  processing_status text not null default 'idle' check (processing_status in ('idle', 'uploading', 'processing', 'ready', 'failed')),
  status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.asset_versions add column if not exists review_id text references public.reviews(id) on delete cascade;
alter table public.asset_versions add column if not exists asset_id text references public.assets(id) on delete cascade;
alter table public.asset_versions add column if not exists label text not null default 'Version A';
alter table public.asset_versions add column if not exists version_number integer not null default 1;
alter table public.asset_versions add column if not exists sort_order integer not null default 0;
alter table public.asset_versions add column if not exists source_url text;
alter table public.asset_versions add column if not exists preview_url text;
alter table public.asset_versions add column if not exists thumbnail_url text;
alter table public.asset_versions add column if not exists storage_path text;
alter table public.asset_versions add column if not exists mime_type text;
alter table public.asset_versions add column if not exists width integer;
alter table public.asset_versions add column if not exists height integer;
alter table public.asset_versions add column if not exists page_count integer;
alter table public.asset_versions add column if not exists preview_bytes bigint;
alter table public.asset_versions add column if not exists processing_status text not null default 'idle';
alter table public.asset_versions add column if not exists status text;
alter table public.asset_versions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.asset_versions add column if not exists created_at timestamptz not null default now();
alter table public.asset_versions add column if not exists updated_at timestamptz not null default now();

create index if not exists asset_versions_review_id_idx on public.asset_versions (review_id);
create index if not exists asset_versions_asset_id_idx on public.asset_versions (asset_id);
create index if not exists asset_versions_review_asset_sort_idx on public.asset_versions (review_id, asset_id, sort_order);

insert into public.asset_versions (
  id,
  review_id,
  asset_id,
  label,
  version_number,
  sort_order,
  storage_path,
  mime_type,
  width,
  height,
  page_count,
  preview_bytes,
  processing_status,
  status,
  metadata,
  created_at,
  updated_at
)
select
  assets.id || '-version-' || coalesce(assets.option_id, 'legacy'),
  assets.review_id,
  assets.id,
  coalesce(review_options.title, 'Version A'),
  greatest(coalesce(review_options.sort_order, 0) + 1, 1),
  coalesce(review_options.sort_order, assets.sort_order, 0),
  assets.storage_path,
  coalesce(assets.original_mime_type, assets.preview_mime_type),
  assets.width,
  assets.height,
  assets.page_count,
  assets.preview_bytes,
  assets.processing_status,
  assets.processing_status,
  jsonb_build_object(
    'legacyOptionId', assets.option_id,
    'originalName', assets.original_name,
    'originalMimeType', assets.original_mime_type,
    'originalBytes', assets.original_bytes,
    'previewMimeType', assets.preview_mime_type,
    'thumbnailStoragePath', assets.thumbnail_storage_path,
    'pageNumber', assets.page_number
  ),
  assets.created_at,
  now()
from public.assets
left join public.review_options on review_options.id = assets.option_id
where not exists (
  select 1
  from public.asset_versions
  where asset_versions.asset_id = assets.id
);

create table if not exists public.comments (
  id text primary key,
  review_id text not null references public.reviews(id) on delete cascade,
  asset_id text references public.assets(id) on delete cascade,
  asset_version_id text references public.asset_versions(id) on delete cascade,
  option_id text references public.review_options(id) on delete set null,
  parent_comment_id text references public.comments(id) on delete cascade,
  author_name text not null,
  author_role text not null default 'reviewer' check (author_role in ('creator', 'reviewer')),
  body text not null,
  x_percent numeric(5,2),
  y_percent numeric(5,2),
  page_number integer,
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolved_at timestamptz,
  resolved_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.comments add column if not exists review_id text references public.reviews(id) on delete cascade;
alter table public.comments add column if not exists asset_id text references public.assets(id) on delete cascade;
alter table public.comments add column if not exists asset_version_id text references public.asset_versions(id) on delete cascade;
alter table public.comments add column if not exists option_id text references public.review_options(id) on delete set null;
alter table public.comments add column if not exists parent_comment_id text references public.comments(id) on delete cascade;
alter table public.comments add column if not exists author_name text not null default 'Reviewer';
alter table public.comments add column if not exists author_role text not null default 'reviewer';
alter table public.comments add column if not exists body text not null default '';
alter table public.comments add column if not exists x_percent numeric(5,2);
alter table public.comments add column if not exists y_percent numeric(5,2);
alter table public.comments add column if not exists page_number integer;
alter table public.comments add column if not exists status text not null default 'open';
alter table public.comments add column if not exists resolved_at timestamptz;
alter table public.comments add column if not exists resolved_by text;
alter table public.comments add column if not exists created_at timestamptz not null default now();
alter table public.comments add column if not exists updated_at timestamptz not null default now();

create table if not exists public.decisions (
  id text primary key,
  review_id text not null references public.reviews(id) on delete cascade,
  asset_version_id text references public.asset_versions(id) on delete set null,
  option_id text references public.review_options(id) on delete set null,
  reviewer_name text not null,
  type text not null check (type in ('approved', 'changes_requested', 'direction_selected', 'combine_options')),
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.review_feedback (
  id text primary key,
  review_id text not null references public.reviews(id) on delete cascade,
  reviewer_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.decisions add column if not exists review_id text references public.reviews(id) on delete cascade;
alter table public.decisions add column if not exists asset_version_id text references public.asset_versions(id) on delete set null;
alter table public.decisions add column if not exists option_id text references public.review_options(id) on delete set null;
alter table public.decisions add column if not exists reviewer_name text not null default 'Reviewer';
alter table public.decisions add column if not exists type text not null default 'approved';
alter table public.decisions add column if not exists note text not null default '';
alter table public.decisions add column if not exists created_at timestamptz not null default now();

alter table public.review_feedback add column if not exists review_id text references public.reviews(id) on delete cascade;
alter table public.review_feedback add column if not exists reviewer_name text not null default 'Reviewer';
alter table public.review_feedback add column if not exists body text not null default '';
alter table public.review_feedback add column if not exists created_at timestamptz not null default now();

update public.comments
set asset_version_id = asset_versions.id
from public.asset_versions
where comments.asset_version_id is null
  and comments.asset_id = asset_versions.asset_id
  and (
    comments.option_id is null
    or asset_versions.metadata ->> 'legacyOptionId' = comments.option_id
  );

create or replace function public.sync_review_status_from_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reviews
  set status = case new.type
      when 'approved' then 'approved'
      when 'changes_requested' then 'changes_requested'
      when 'direction_selected' then 'direction_selected'
      when 'combine_options' then 'changes_requested'
      else status
    end,
    updated_at = now()
  where id = new.review_id
    and status not in ('draft', 'archived');

  return new;
end;
$$;

drop trigger if exists sync_review_status_from_decision_trigger on public.decisions;
create trigger sync_review_status_from_decision_trigger
after insert on public.decisions
for each row execute function public.sync_review_status_from_decision();

alter table public.projects enable row level security;
alter table public.reviews enable row level security;
alter table public.review_options enable row level security;
alter table public.assets enable row level security;
alter table public.asset_versions enable row level security;
alter table public.comments enable row level security;
alter table public.decisions enable row level security;
alter table public.review_feedback enable row level security;

drop policy if exists "Shared active reviews can save feedback snapshot" on public.reviews;
drop policy if exists "Shared active reviews can sync options" on public.review_options;
drop policy if exists "Shared active reviews can update options" on public.review_options;
drop policy if exists "Shared active reviews can sync assets" on public.assets;
drop policy if exists "Shared active reviews can update assets" on public.assets;
drop policy if exists "Anyone with visible review can update own comment row" on public.comments;
drop policy if exists "Anyone with visible review can comment" on public.comments;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'projects' and policyname = 'Creators manage own projects') then
    create policy "Creators manage own projects" on public.projects
      for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reviews' and policyname = 'Creators manage own reviews') then
    create policy "Creators manage own reviews" on public.reviews
      for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reviews' and policyname = 'Shared reviews are readable') then
    create policy "Shared reviews are readable" on public.reviews
      for select using (status not in ('draft', 'archived'));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'review_options' and policyname = 'Visible options belong to visible reviews') then
    create policy "Visible options belong to visible reviews" on public.review_options
      for select using (exists (select 1 from public.reviews where reviews.id = review_options.review_id and reviews.status not in ('draft', 'archived')));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'review_options' and policyname = 'Creators manage options') then
    create policy "Creators manage options" on public.review_options
      for all using (exists (select 1 from public.reviews where reviews.id = review_options.review_id and reviews.owner_id = auth.uid()))
      with check (exists (select 1 from public.reviews where reviews.id = review_options.review_id and reviews.owner_id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'assets' and policyname = 'Visible assets belong to visible reviews') then
    create policy "Visible assets belong to visible reviews" on public.assets
      for select using (exists (select 1 from public.reviews where reviews.id = assets.review_id and reviews.status not in ('draft', 'archived')));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'assets' and policyname = 'Creators manage assets') then
    create policy "Creators manage assets" on public.assets
      for all using (exists (select 1 from public.reviews where reviews.id = assets.review_id and reviews.owner_id = auth.uid()))
      with check (exists (select 1 from public.reviews where reviews.id = assets.review_id and reviews.owner_id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'asset_versions' and policyname = 'Visible asset versions belong to visible reviews') then
    create policy "Visible asset versions belong to visible reviews" on public.asset_versions
      for select using (exists (select 1 from public.reviews where reviews.id = asset_versions.review_id and reviews.status not in ('draft', 'archived')));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'asset_versions' and policyname = 'Creators manage asset versions') then
    create policy "Creators manage asset versions" on public.asset_versions
      for all using (exists (select 1 from public.reviews where reviews.id = asset_versions.review_id and reviews.owner_id = auth.uid()))
      with check (exists (select 1 from public.reviews where reviews.id = asset_versions.review_id and reviews.owner_id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'comments' and policyname = 'Visible comments belong to visible reviews') then
    create policy "Visible comments belong to visible reviews" on public.comments
      for select using (exists (select 1 from public.reviews where reviews.id = comments.review_id and reviews.status not in ('draft', 'archived')));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'comments' and policyname = 'Anyone with visible review can comment') then
    create policy "Anyone with visible review can comment" on public.comments
      for insert with check (
        status = 'open'
        and resolved_at is null
        and resolved_by is null
        and exists (select 1 from public.reviews where reviews.id = comments.review_id and reviews.status not in ('draft', 'approved', 'archived') and reviews.allow_comments)
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'comments' and policyname = 'Creators manage comments') then
    create policy "Creators manage comments" on public.comments
      for all using (exists (select 1 from public.reviews where reviews.id = comments.review_id and reviews.owner_id = auth.uid()))
      with check (exists (select 1 from public.reviews where reviews.id = comments.review_id and reviews.owner_id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'decisions' and policyname = 'Visible decisions belong to visible reviews') then
    create policy "Visible decisions belong to visible reviews" on public.decisions
      for select using (exists (select 1 from public.reviews where reviews.id = decisions.review_id and reviews.status not in ('draft', 'archived')));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'decisions' and policyname = 'Anyone with visible review can decide') then
    create policy "Anyone with visible review can decide" on public.decisions
      for insert with check (exists (select 1 from public.reviews where reviews.id = decisions.review_id and reviews.status not in ('draft', 'approved', 'archived') and reviews.allow_decisions));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'review_feedback' and policyname = 'Visible feedback belongs to visible reviews') then
    create policy "Visible feedback belongs to visible reviews" on public.review_feedback
      for select using (exists (select 1 from public.reviews where reviews.id = review_feedback.review_id and reviews.status not in ('draft', 'archived')));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'review_feedback' and policyname = 'Anyone with visible review can leave feedback') then
    create policy "Anyone with visible review can leave feedback" on public.review_feedback
      for insert with check (exists (select 1 from public.reviews where reviews.id = review_feedback.review_id and reviews.status not in ('draft', 'approved', 'archived') and reviews.allow_comments));
  end if;
end
$$;

drop policy if exists "Prototype can create shared reviews" on public.reviews;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-previews', 'review-previews', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public can read review previews') then
    create policy "Public can read review previews" on storage.objects
      for select using (bucket_id = 'review-previews');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Authenticated creators upload review previews') then
    create policy "Authenticated creators upload review previews" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'review-previews');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Authenticated creators update review previews') then
    create policy "Authenticated creators update review previews" on storage.objects
      for update to authenticated
      using (bucket_id = 'review-previews')
      with check (bucket_id = 'review-previews');
  end if;
end
$$;

drop policy if exists "Prototype can upload review previews" on storage.objects;
drop policy if exists "Prototype can update review previews" on storage.objects;
