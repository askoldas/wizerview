-- Rendered PDF page rows are creator-managed structured preview metadata.
-- The original PDF is never stored by this flow.
alter table public.asset_version_pages enable row level security;

drop policy if exists "Creators manage asset version pages" on public.asset_version_pages;
create policy "Creators manage asset version pages" on public.asset_version_pages
  for all
  using (exists (
    select 1
    from public.asset_versions av
    join public.reviews r on r.id = av.review_id
    where av.id = asset_version_pages.asset_version_id and r.owner_id = auth.uid()
  ))
  with check (exists (
    select 1
    from public.asset_versions av
    join public.reviews r on r.id = av.review_id
    where av.id = asset_version_pages.asset_version_id and r.owner_id = auth.uid()
  ));
