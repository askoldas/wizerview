-- Permit derived completion for selection and feedback-only review goals.
alter table public.reviews drop constraint if exists reviews_status_check;
alter table public.reviews add constraint reviews_status_check
  check (status in ('draft', 'in_review', 'changes_requested', 'direction_selected', 'approved', 'completed', 'archived'));
