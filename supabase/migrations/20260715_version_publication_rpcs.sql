-- Creator-only Version publication and withdrawal. Historical rows remain intact.
create or replace function public.set_asset_version_publication(p_version_id text, p_publication text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v public.asset_versions%rowtype;
begin
  if p_publication not in ('draft','published','withdrawn') then raise exception 'Invalid version publication state.'; end if;
  select av.* into v from public.asset_versions av join public.reviews r on r.id = av.review_id where av.id = p_version_id and r.owner_id = auth.uid();
  if not found then raise exception 'Version not found.'; end if;
  if p_publication = 'draft' and exists (select 1 from public.comments c where c.asset_version_id = v.id) then raise exception 'A version with client history cannot return to draft.'; end if;
  update public.asset_versions set publication_status = p_publication, published_at = case when p_publication = 'published' then coalesce(published_at, now()) else published_at end, withdrawn_at = case when p_publication = 'withdrawn' then now() else null end, updated_at = now() where id = v.id;
end; $$;
grant execute on function public.set_asset_version_publication(text, text) to authenticated;
