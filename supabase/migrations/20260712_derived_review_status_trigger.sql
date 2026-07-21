-- Derive review status from the latest decision for every deliverable.
create or replace function public.sync_review_status_from_decision()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare goal text; total_assets integer; completed_assets integer; has_changes boolean;
begin
  select review_goal into goal from public.reviews where id = new.review_id;
  select count(*) into total_assets from public.assets where review_id = new.review_id;
  select exists(select 1 from (select distinct on (asset_id) asset_id, type from public.decisions where review_id = new.review_id and asset_id is not null order by asset_id, created_at desc) latest where type = 'changes_requested') into has_changes;
  select count(*) into completed_assets from (select distinct on (asset_id) asset_id, type from public.decisions where review_id = new.review_id and asset_id is not null order by asset_id, created_at desc) latest
  where (goal = 'approve_final' and type = 'approved') or (goal = 'select_version' and type = 'direction_selected') or (goal = 'feedback_only' and type = 'reviewed');
  update public.reviews set status = case when has_changes then 'changes_requested' when total_assets > 0 and completed_assets = total_assets and goal = 'approve_final' then 'approved' when total_assets > 0 and completed_assets = total_assets then 'completed' else 'in_review' end, updated_at = now()
  where id = new.review_id and status not in ('draft', 'archived');
  return new;
end; $$;
