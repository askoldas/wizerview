-- Preserve legacy names while recording authenticated authorship for all new work.
create table if not exists public.guest_reviewer_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  review_id text not null references public.reviews(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);
create index if not exists guest_reviewer_sessions_review_expiry_idx on public.guest_reviewer_sessions(review_id, expires_at desc);

alter table public.comments add column if not exists author_user_id uuid references auth.users(id) on delete set null;
alter table public.comments add column if not exists author_name_snapshot text;
alter table public.comments add column if not exists guest_session_id uuid references public.guest_reviewer_sessions(id) on delete set null;
alter table public.decisions add column if not exists author_user_id uuid references auth.users(id) on delete set null;
alter table public.decisions add column if not exists author_name_snapshot text;
alter table public.decisions add column if not exists guest_session_id uuid references public.guest_reviewer_sessions(id) on delete set null;
alter table public.review_feedback add column if not exists author_user_id uuid references auth.users(id) on delete set null;
alter table public.review_feedback add column if not exists author_name_snapshot text;
alter table public.review_feedback add column if not exists guest_session_id uuid references public.guest_reviewer_sessions(id) on delete set null;
alter table public.project_requests add column if not exists requested_by_user_id uuid references auth.users(id) on delete set null;
alter table public.project_requests add column if not exists requested_by_name_snapshot text;
alter table public.project_request_messages add column if not exists author_user_id uuid references auth.users(id) on delete set null;
alter table public.project_request_messages add column if not exists author_name_snapshot text;

update public.comments set author_name_snapshot = author_name where author_name_snapshot is null;
update public.decisions set author_name_snapshot = reviewer_name where author_name_snapshot is null;
update public.review_feedback set author_name_snapshot = reviewer_name where author_name_snapshot is null;
update public.project_requests set requested_by_name_snapshot = requested_by_name where requested_by_name_snapshot is null;
update public.project_request_messages set author_name_snapshot = author_name where author_name_snapshot is null;

create or replace function public.apply_authenticated_comment_author()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_name text;
begin
  if auth.uid() is not null then
    select display_name into v_name from public.profiles where user_id = auth.uid();
    new.author_user_id := auth.uid(); new.guest_session_id := null;
    new.author_name_snapshot := coalesce(nullif(trim(v_name), ''), new.author_name, 'WizerView user');
    new.author_name := new.author_name_snapshot;
  else
    new.author_name_snapshot := coalesce(new.author_name_snapshot, new.author_name, 'Reviewer');
  end if;
  return new;
end; $$;

drop trigger if exists apply_authenticated_comment_author on public.comments;
create trigger apply_authenticated_comment_author before insert on public.comments for each row execute function public.apply_authenticated_comment_author();

create or replace function public.apply_authenticated_decision_author()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_name text;
begin
  if auth.uid() is not null then select display_name into v_name from public.profiles where user_id = auth.uid(); new.author_user_id := auth.uid(); new.guest_session_id := null; new.author_name_snapshot := coalesce(nullif(trim(v_name), ''), new.reviewer_name, 'WizerView user'); new.reviewer_name := new.author_name_snapshot; else new.author_name_snapshot := coalesce(new.author_name_snapshot, new.reviewer_name, 'Reviewer'); end if;
  return new;
end; $$;
drop trigger if exists apply_authenticated_decision_author on public.decisions;
create trigger apply_authenticated_decision_author before insert on public.decisions for each row execute function public.apply_authenticated_decision_author();

create or replace function public.apply_authenticated_request_message_author()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_name text;
begin
  if auth.uid() is not null then select display_name into v_name from public.profiles where user_id = auth.uid(); new.author_user_id := auth.uid(); new.author_name_snapshot := coalesce(nullif(trim(v_name), ''), new.author_name, 'WizerView user'); new.author_name := new.author_name_snapshot; else new.author_name_snapshot := coalesce(new.author_name_snapshot, new.author_name, 'Client'); end if;
  return new;
end; $$;
drop trigger if exists apply_authenticated_request_message_author on public.project_request_messages;
create trigger apply_authenticated_request_message_author before insert on public.project_request_messages for each row execute function public.apply_authenticated_request_message_author();
