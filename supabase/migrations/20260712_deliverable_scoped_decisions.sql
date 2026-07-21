-- Preserve history while making the active outcome explicitly deliverable-scoped.
alter table public.decisions add column if not exists asset_id text references public.assets(id) on delete set null;
update public.decisions d set asset_id = av.asset_id from public.asset_versions av
where d.asset_id is null and d.asset_version_id = av.id;
alter table public.decisions drop constraint if exists decisions_type_check;
alter table public.decisions add constraint decisions_type_check check (type in ('reviewed', 'approved', 'changes_requested', 'direction_selected', 'combine_options'));
create index if not exists decisions_review_asset_created_at_idx on public.decisions (review_id, asset_id, created_at desc);

create or replace function public.add_shared_decision(
  p_share_token text, p_decision_id text, p_review_id text, p_asset_id text,
  p_asset_version_id text, p_reviewer_name text, p_type text, p_note text
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare matched_review public.reviews%rowtype;
begin
  select * into matched_review from public.reviews where id = p_review_id and share_token = p_share_token and status not in ('draft', 'approved', 'archived') and allow_decisions;
  if not found then raise exception 'Shared review is not accepting decisions.'; end if;
  if not exists (select 1 from public.assets where id = p_asset_id and review_id = matched_review.id) then raise exception 'Deliverable does not belong to shared review.'; end if;
  if p_asset_version_id is not null and not exists (select 1 from public.asset_versions where id = p_asset_version_id and asset_id = p_asset_id and review_id = matched_review.id) then raise exception 'Version does not belong to deliverable.'; end if;
  insert into public.decisions (id, review_id, asset_id, asset_version_id, reviewer_name, type, note) values (p_decision_id, matched_review.id, p_asset_id, p_asset_version_id, nullif(trim(p_reviewer_name), ''), p_type, coalesce(p_note, ''));
end; $$;
grant execute on function public.add_shared_decision(text, text, text, text, text, text, text, text) to anon, authenticated;
