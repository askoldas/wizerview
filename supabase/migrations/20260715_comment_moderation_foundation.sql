-- Preserve thread and pin history for edits/removals.
alter table public.comments add column if not exists edited_at timestamptz;
alter table public.comments add column if not exists removed_at timestamptz;
alter table public.comments add column if not exists removed_by_role text;
alter table public.comments add column if not exists removal_reason text;
alter table public.project_request_messages add column if not exists edited_at timestamptz;
alter table public.project_request_messages add column if not exists removed_at timestamptz;
alter table public.project_request_messages add column if not exists removed_by_role text;
alter table public.project_request_messages add column if not exists removal_reason text;
alter table public.comments add constraint comments_removed_by_role_check check (removed_by_role is null or removed_by_role in ('creator','reviewer'));
alter table public.project_request_messages add constraint request_messages_removed_by_role_check check (removed_by_role is null or removed_by_role in ('creator','client'));
