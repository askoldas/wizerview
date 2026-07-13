-- Normalise the first project migration's legacy `approve` default.
alter table public.reviews alter column review_goal set default 'approve_final';
update public.reviews
set review_goal = case
  when review_goal = 'approve' then 'approve_final'
  when review_goal is null or review_goal = '' then 'approve_final'
  else review_goal
end;
alter table public.reviews drop constraint if exists reviews_review_goal_check;
alter table public.reviews add constraint reviews_review_goal_check
  check (review_goal in ('feedback_only', 'select_version', 'approve_final'));
