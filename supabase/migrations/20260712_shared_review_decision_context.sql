-- Supply public review pages with the review goal and the latest outcome per deliverable.
-- This is deliberately separate from get_shared_review so existing shared payloads stay intact.
create or replace function public.get_shared_review_decision_context(p_share_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  review_row public.reviews%rowtype;
  outcomes jsonb;
begin
  select * into review_row
  from public.reviews
  where share_token = p_share_token
    and status not in ('draft', 'archived');

  if not found then return null; end if;

  select coalesce(jsonb_object_agg(latest.asset_id, jsonb_build_object(
    'type', latest.type,
    'note', latest.note,
    'assetVersionId', coalesce(latest.asset_version_id, latest.option_id),
    'reviewerName', latest.reviewer_name,
    'createdAt', latest.created_at
  )), '{}'::jsonb)
  into outcomes
  from (
    select distinct on (asset_id) asset_id, type, note, asset_version_id, option_id, reviewer_name, created_at
    from public.decisions
    where review_id = review_row.id and asset_id is not null
    order by asset_id, created_at desc
  ) latest;

  return jsonb_build_object(
    'reviewGoal', coalesce(review_row.review_goal, 'approve_final'),
    'decisionOutcomes', outcomes
  );
end;
$$;

grant execute on function public.get_shared_review_decision_context(text) to anon, authenticated;
