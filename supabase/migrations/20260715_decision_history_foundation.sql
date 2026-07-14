-- Append-only Decision history and explicit invalidation/supersession metadata.
alter table public.decisions add column if not exists review_round_id text references public.review_rounds(id) on delete set null;
alter table public.decisions add column if not exists invalidated_at timestamptz;
alter table public.decisions add column if not exists invalidation_reason text;
alter table public.decisions add column if not exists superseded_by_decision_id text references public.decisions(id) on delete set null;
create index if not exists decisions_review_asset_valid_idx on public.decisions(review_id, asset_id, created_at desc) where invalidated_at is null;

create or replace function public.invalidate_decision(p_decision_id text, p_reason text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from public.decisions d join public.reviews r on r.id = d.review_id where d.id = p_decision_id and r.owner_id = auth.uid()) then raise exception 'Decision not found.'; end if;
  update public.decisions set invalidated_at = now(), invalidation_reason = nullif(trim(p_reason), '') where id = p_decision_id and invalidated_at is null;
end; $$;
grant execute on function public.invalidate_decision(text, text) to authenticated;
