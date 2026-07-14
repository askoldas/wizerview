-- Project sharing controls and the first structured client Request domain.
alter table public.projects add column if not exists sharing_enabled boolean not null default true;
alter table public.projects add column if not exists access_code_hash text;
alter table public.projects add column if not exists access_code_version integer not null default 0;
alter table public.projects add column if not exists allow_client_requests boolean not null default true;
alter table public.projects add column if not exists allow_client_request_references boolean not null default true;
alter table public.projects add column if not exists allow_client_request_replies boolean not null default true;

create table if not exists public.project_requests (
  id text primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  brief text not null check (char_length(trim(brief)) between 1 and 5000),
  status text not null default 'new' check (status in ('new','discussing','in_progress','ready_for_review','closed','declined')),
  requested_by_name text not null,
  linked_review_id text references public.reviews(id) on delete set null,
  client_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.project_request_references (
  id text primary key,
  request_id text not null references public.project_requests(id) on delete cascade,
  reference_type text not null check (reference_type in ('image','pdf','link')),
  title text,
  url text,
  storage_path text,
  mime_type text,
  note text check (note is null or char_length(note) <= 2000),
  sort_order integer not null default 0,
  created_by_role text not null check (created_by_role in ('client','creator')),
  created_by_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.project_request_messages (
  id text primary key,
  request_id text not null references public.project_requests(id) on delete cascade,
  author_role text not null check (author_role in ('client','creator')),
  author_name text not null,
  body text not null check (char_length(trim(body)) between 1 and 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_requests_project_updated_idx on public.project_requests(project_id, updated_at desc);
create index if not exists project_request_references_request_sort_idx on public.project_request_references(request_id, sort_order);
create index if not exists project_request_messages_request_created_idx on public.project_request_messages(request_id, created_at);

alter table public.project_requests enable row level security;
alter table public.project_request_references enable row level security;
alter table public.project_request_messages enable row level security;

create or replace function public.get_shared_project(p_share_token text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare p public.projects%rowtype;
begin
  select * into p from public.projects where share_token = p_share_token and archived_at is null and sharing_enabled;
  if not found then return null; end if;
  return jsonb_build_object(
    'title', p.name, 'client', coalesce(p.client_name, ''), 'description', p.description,
    'reviews', coalesce((select jsonb_agg(jsonb_build_object('title', r.title, 'status', r.status, 'shareToken', r.share_token, 'updatedAt', r.updated_at, 'deliverableCount', (select count(*) from public.assets a where a.review_id = r.id), 'openCommentCount', (select count(*) from public.comments c where c.review_id = r.id and c.parent_comment_id is null and c.status = 'open')) order by r.updated_at desc) from public.reviews r where r.project_id = p.id and r.client_visible and r.status not in ('draft','archived')), '[]'::jsonb),
    'requests', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'title', q.title, 'status', q.status, 'requestedByName', q.requested_by_name, 'linkedReviewShareToken', r.share_token, 'updatedAt', q.updated_at, 'messageCount', (select count(*) from public.project_request_messages m where m.request_id = q.id)) order by q.updated_at desc) from public.project_requests q left join public.reviews r on r.id = q.linked_review_id where q.project_id = p.id and q.client_visible), '[]'::jsonb),
    'allowClientRequests', p.allow_client_requests
  );
end; $$;

create or replace function public.add_shared_project_request(p_share_token text, p_request_id text, p_reviewer_name text, p_title text, p_brief text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare p public.projects%rowtype;
begin
  select * into p from public.projects where share_token = p_share_token and archived_at is null and sharing_enabled and allow_client_requests;
  if not found then raise exception 'This project is not available.'; end if;
  if char_length(trim(p_title)) not between 1 and 160 or char_length(trim(p_brief)) not between 1 and 5000 then raise exception 'Invalid request.'; end if;
  insert into public.project_requests(id, project_id, title, brief, requested_by_name) values (p_request_id, p.id, trim(p_title), trim(p_brief), nullif(trim(p_reviewer_name), ''));
end; $$;

grant execute on function public.get_shared_project(text) to anon, authenticated;
grant execute on function public.add_shared_project_request(text, text, text, text, text) to anon, authenticated;
