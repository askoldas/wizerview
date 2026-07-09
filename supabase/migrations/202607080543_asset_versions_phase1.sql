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
  processing_status text not null default 'idle',
  status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assets add column if not exists asset_type text;
alter table public.assets add column if not exists status text;
alter table public.assets add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.assets add column if not exists updated_at timestamptz not null default now();

alter table public.comments add column if not exists asset_version_id text references public.asset_versions(id) on delete cascade;
alter table public.decisions add column if not exists asset_version_id text references public.asset_versions(id) on delete set null;

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
  select 1 from public.asset_versions where asset_versions.asset_id = assets.id
);

update public.comments
set asset_version_id = asset_versions.id
from public.asset_versions
where comments.asset_version_id is null
  and comments.asset_id = asset_versions.asset_id
  and (
    comments.option_id is null
    or asset_versions.metadata ->> 'legacyOptionId' = comments.option_id
  );

alter table public.asset_versions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'asset_versions' and policyname = 'Visible asset versions belong to visible reviews') then
    create policy "Visible asset versions belong to visible reviews" on public.asset_versions
      for select using (exists (select 1 from public.reviews where reviews.id = asset_versions.review_id and reviews.status not in ('draft', 'archived')));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'asset_versions' and policyname = 'Creators manage asset versions') then
    create policy "Creators manage asset versions" on public.asset_versions
      for all using (exists (select 1 from public.reviews where reviews.id = asset_versions.review_id and reviews.owner_id = auth.uid()))
      with check (exists (select 1 from public.reviews where reviews.id = asset_versions.review_id and reviews.owner_id = auth.uid()));
  end if;
end
$$;
