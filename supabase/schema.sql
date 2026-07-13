create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  client_name text,
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  share_token text unique default encode(gen_random_bytes(24), 'hex'),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id text primary key,
  project_id uuid references public.projects(id) on delete set null,
  owner_id uuid references auth.users(id) on delete cascade,
  title text not null default 'Untitled review',
  client_name text,
  instructions text not null default '',
  review_goal text not null default 'approve_final' check (review_goal in ('feedback_only', 'select_version', 'approve_final')),
  client_visible boolean not null default false,
  brief_message text not null default '',
  brief_focus_points text[] not null default '{}'::text[],
  brief_requested_outcome text not null default '',
  brief_updated_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'changes_requested', 'direction_selected', 'approved', 'completed', 'archived')),
  share_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  reviewer_name_required boolean not null default true,
  pin_protection_enabled boolean not null default false,
  allow_comments boolean not null default true,
  allow_decisions boolean not null default true,
  content jsonb not null default '{}'::jsonb,
  creator_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects add column if not exists description text not null default '';
alter table public.projects add column if not exists status text not null default 'active';
alter table public.projects add column if not exists share_token text unique default encode(gen_random_bytes(24), 'hex');
alter table public.projects add column if not exists archived_at timestamptz;

alter table public.reviews add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.reviews add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.reviews add column if not exists title text not null default 'Untitled review';
alter table public.reviews add column if not exists client_name text;
alter table public.reviews add column if not exists instructions text not null default '';
alter table public.reviews add column if not exists review_goal text not null default 'approve_final';
alter table public.reviews add column if not exists client_visible boolean not null default false;
alter table public.reviews add column if not exists brief_message text not null default '';
alter table public.reviews add column if not exists brief_focus_points text[] not null default '{}'::text[];
alter table public.reviews add column if not exists brief_requested_outcome text not null default '';
alter table public.reviews add column if not exists brief_updated_at timestamptz;
alter table public.reviews add column if not exists status text not null default 'draft';
alter table public.reviews add column if not exists share_token text not null default encode(gen_random_bytes(24), 'hex');
alter table public.reviews add column if not exists reviewer_name_required boolean not null default true;
alter table public.reviews add column if not exists pin_protection_enabled boolean not null default false;
alter table public.reviews add column if not exists allow_comments boolean not null default true;
alter table public.reviews add column if not exists allow_decisions boolean not null default true;
alter table public.reviews add column if not exists content jsonb not null default '{}'::jsonb;
alter table public.reviews add column if not exists creator_seen_at timestamptz;
alter table public.reviews add column if not exists created_at timestamptz not null default now();
alter table public.reviews add column if not exists updated_at timestamptz not null default now();

create unique index if not exists reviews_share_token_key on public.reviews (share_token);

create table if not exists public.review_options (
  id text primary key,
  review_id text not null references public.reviews(id) on delete cascade,
  title text not null,
  description text not null default '',
  feedback text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.review_options add column if not exists review_id text references public.reviews(id) on delete cascade;
alter table public.review_options add column if not exists title text not null default 'Option';
alter table public.review_options add column if not exists description text not null default '';
alter table public.review_options add column if not exists feedback text not null default '';
alter table public.review_options add column if not exists sort_order integer not null default 0;
alter table public.review_options add column if not exists created_at timestamptz not null default now();

create table if not exists public.assets (
  id text primary key,
  review_id text not null references public.reviews(id) on delete cascade,
  option_id text references public.review_options(id) on delete cascade,
  type text not null check (type in ('image', 'screenshot', 'pdf', 'pdf_page')),
  title text not null,
  description text not null default '',
  original_name text,
  original_mime_type text,
  original_bytes bigint,
  preview_mime_type text,
  preview_bytes bigint,
  storage_path text,
  thumbnail_storage_path text,
  width integer,
  height integer,
  page_number integer,
  page_count integer,
  processing_status text not null default 'idle' check (processing_status in ('idle', 'uploading', 'processing', 'ready', 'failed')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.assets add column if not exists review_id text references public.reviews(id) on delete cascade;
alter table public.assets add column if not exists option_id text references public.review_options(id) on delete cascade;
alter table public.assets add column if not exists type text not null default 'screenshot';
alter table public.assets add column if not exists title text not null default 'Asset';
alter table public.assets add column if not exists description text not null default '';
alter table public.assets add column if not exists original_name text;
alter table public.assets add column if not exists original_mime_type text;
alter table public.assets add column if not exists original_bytes bigint;
alter table public.assets add column if not exists preview_mime_type text;
alter table public.assets add column if not exists preview_bytes bigint;
alter table public.assets add column if not exists storage_path text;
alter table public.assets add column if not exists thumbnail_storage_path text;
alter table public.assets add column if not exists width integer;
alter table public.assets add column if not exists height integer;
alter table public.assets add column if not exists page_number integer;
alter table public.assets add column if not exists page_count integer;
alter table public.assets add column if not exists processing_status text not null default 'idle';
alter table public.assets add column if not exists sort_order integer not null default 0;
alter table public.assets add column if not exists created_at timestamptz not null default now();
alter table public.assets add column if not exists asset_type text;
alter table public.assets add column if not exists status text;
alter table public.assets add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.assets add column if not exists updated_at timestamptz not null default now();

create table if not exists public.asset_versions (
  id text primary key default gen_random_uuid()::text,
  review_id text not null references public.reviews(id) on delete cascade,
  asset_id text not null references public.assets(id) on delete cascade,
  label text not null,
  version_number integer not null default 1,
  sort_order integer not null default 0,
  source_url text,
  preview_url text,
  thumbnail_url text,
  storage_path text,
  mime_type text,
  width integer,
  height integer,
  page_count integer,
  preview_bytes bigint,
  processing_status text not null default 'idle' check (processing_status in ('idle', 'uploading', 'processing', 'ready', 'failed')),
  status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.asset_versions add column if not exists review_id text references public.reviews(id) on delete cascade;
alter table public.asset_versions add column if not exists asset_id text references public.assets(id) on delete cascade;
alter table public.asset_versions add column if not exists label text not null default 'Version A';
alter table public.asset_versions add column if not exists version_number integer not null default 1;
alter table public.asset_versions add column if not exists sort_order integer not null default 0;
alter table public.asset_versions add column if not exists source_url text;
alter table public.asset_versions add column if not exists preview_url text;
alter table public.asset_versions add column if not exists thumbnail_url text;
alter table public.asset_versions add column if not exists storage_path text;
alter table public.asset_versions add column if not exists mime_type text;
alter table public.asset_versions add column if not exists width integer;
alter table public.asset_versions add column if not exists height integer;
alter table public.asset_versions add column if not exists page_count integer;
alter table public.asset_versions add column if not exists preview_bytes bigint;
alter table public.asset_versions add column if not exists processing_status text not null default 'idle';
alter table public.asset_versions add column if not exists status text;
alter table public.asset_versions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.asset_versions add column if not exists created_at timestamptz not null default now();
alter table public.asset_versions add column if not exists updated_at timestamptz not null default now();

create index if not exists asset_versions_review_id_idx on public.asset_versions (review_id);
create index if not exists asset_versions_asset_id_idx on public.asset_versions (asset_id);
create index if not exists asset_versions_review_asset_sort_idx on public.asset_versions (review_id, asset_id, sort_order);

insert into public.asset_versions (
  id,
  review_id,
  asset_id,
  label,
  version_number,
  sort_order,
  storage_path,
  mime_type,
  width,
  height,
  page_count,
  preview_bytes,
  processing_status,
  status,
  metadata,
  created_at,
  updated_at
)
select
  assets.id || '-version-' || coalesce(assets.option_id, 'legacy'),
  assets.review_id,
  assets.id,
  coalesce(review_options.title, 'Version A'),
  greatest(coalesce(review_options.sort_order, 0) + 1, 1),
  coalesce(review_options.sort_order, assets.sort_order, 0),
  assets.storage_path,
  coalesce(assets.original_mime_type, assets.preview_mime_type),
  assets.width,
  assets.height,
  assets.page_count,
  assets.preview_bytes,
  assets.processing_status,
  assets.processing_status,
  jsonb_build_object(
    'legacyOptionId', assets.option_id,
    'originalName', assets.original_name,
    'originalMimeType', assets.original_mime_type,
    'originalBytes', assets.original_bytes,
    'previewMimeType', assets.preview_mime_type,
    'thumbnailStoragePath', assets.thumbnail_storage_path,
    'pageNumber', assets.page_number
  ),
  assets.created_at,
  now()
from public.assets
left join public.review_options on review_options.id = assets.option_id
where not exists (
  select 1
  from public.asset_versions
  where asset_versions.asset_id = assets.id
);

create table if not exists public.comments (
  id text primary key,
  review_id text not null references public.reviews(id) on delete cascade,
  asset_id text references public.assets(id) on delete cascade,
  asset_version_id text references public.asset_versions(id) on delete cascade,
  option_id text references public.review_options(id) on delete set null,
  parent_comment_id text references public.comments(id) on delete cascade,
  author_name text not null,
  author_role text not null default 'reviewer' check (author_role in ('creator', 'reviewer')),
  body text not null,
  x_percent numeric(5,2),
  y_percent numeric(5,2),
  page_number integer,
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolved_at timestamptz,
  resolved_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.comments add column if not exists review_id text references public.reviews(id) on delete cascade;
alter table public.comments add column if not exists asset_id text references public.assets(id) on delete cascade;
alter table public.comments add column if not exists asset_version_id text references public.asset_versions(id) on delete cascade;
alter table public.comments add column if not exists option_id text references public.review_options(id) on delete set null;
alter table public.comments add column if not exists parent_comment_id text references public.comments(id) on delete cascade;
alter table public.comments add column if not exists author_name text not null default 'Reviewer';
alter table public.comments add column if not exists author_role text not null default 'reviewer';
alter table public.comments add column if not exists body text not null default '';
alter table public.comments add column if not exists x_percent numeric(5,2);
alter table public.comments add column if not exists y_percent numeric(5,2);
alter table public.comments add column if not exists page_number integer;
alter table public.comments add column if not exists status text not null default 'open';
alter table public.comments add column if not exists resolved_at timestamptz;
alter table public.comments add column if not exists resolved_by text;
alter table public.comments add column if not exists created_at timestamptz not null default now();
alter table public.comments add column if not exists updated_at timestamptz not null default now();

create table if not exists public.decisions (
  id text primary key,
  review_id text not null references public.reviews(id) on delete cascade,
  asset_id text references public.assets(id) on delete set null,
  asset_version_id text references public.asset_versions(id) on delete set null,
  option_id text references public.review_options(id) on delete set null,
  reviewer_name text not null,
  type text not null check (type in ('reviewed', 'approved', 'changes_requested', 'direction_selected', 'combine_options')),
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.review_feedback (
  id text primary key,
  review_id text not null references public.reviews(id) on delete cascade,
  reviewer_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.decisions add column if not exists review_id text references public.reviews(id) on delete cascade;
alter table public.decisions add column if not exists asset_id text references public.assets(id) on delete set null;
alter table public.decisions add column if not exists asset_version_id text references public.asset_versions(id) on delete set null;
alter table public.decisions add column if not exists option_id text references public.review_options(id) on delete set null;
alter table public.decisions add column if not exists reviewer_name text not null default 'Reviewer';
alter table public.decisions add column if not exists type text not null default 'approved';
alter table public.decisions add column if not exists note text not null default '';
alter table public.decisions add column if not exists created_at timestamptz not null default now();

alter table public.review_feedback add column if not exists review_id text references public.reviews(id) on delete cascade;
alter table public.review_feedback add column if not exists reviewer_name text not null default 'Reviewer';
alter table public.review_feedback add column if not exists body text not null default '';
alter table public.review_feedback add column if not exists created_at timestamptz not null default now();

update public.comments
set asset_version_id = asset_versions.id
from public.asset_versions
where comments.asset_version_id is null
  and comments.asset_id = asset_versions.asset_id
  and (
    comments.option_id is null
    or asset_versions.metadata ->> 'legacyOptionId' = comments.option_id
  );

create or replace function public.sync_review_status_from_decision()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  goal text;
  total_assets integer;
  completed_assets integer;
  has_changes boolean;
begin
  select review_goal into goal from public.reviews where id = new.review_id;
  select count(*) into total_assets from public.assets where review_id = new.review_id;
  select exists(select 1 from (select distinct on (asset_id) asset_id, type from public.decisions where review_id = new.review_id and asset_id is not null order by asset_id, created_at desc) latest where type = 'changes_requested') into has_changes;
  select count(*) into completed_assets from (select distinct on (asset_id) asset_id, type from public.decisions where review_id = new.review_id and asset_id is not null order by asset_id, created_at desc) latest where (goal = 'approve_final' and type = 'approved') or (goal = 'select_version' and type = 'direction_selected') or (goal = 'feedback_only' and type = 'reviewed');
  update public.reviews
  set status = case when has_changes then 'changes_requested' when total_assets > 0 and completed_assets = total_assets and goal = 'approve_final' then 'approved' when total_assets > 0 and completed_assets = total_assets then 'completed' else 'in_review' end,
    updated_at = now()
  where id = new.review_id
    and status not in ('draft', 'archived');

  return new;
end;
$$;

drop trigger if exists sync_review_status_from_decision_trigger on public.decisions;
create trigger sync_review_status_from_decision_trigger
after insert on public.decisions
for each row execute function public.sync_review_status_from_decision();

create or replace function public.get_shared_review(p_share_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  review_row public.reviews%rowtype;
  assets_json jsonb;
  comments_json jsonb;
  latest_feedback text;
  latest_decision public.decisions%rowtype;
begin
  select *
  into review_row
  from public.reviews
  where share_token = p_share_token
    and status not in ('draft', 'archived');

  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', asset_rows.id,
      'reviewId', asset_rows.review_id,
      'title', asset_rows.title,
      'description', asset_rows.description,
      'assetType', asset_rows.type,
      'sortOrder', asset_rows.sort_order,
      'status', coalesce(asset_rows.status, 'in_review'),
      'accent', coalesce(asset_rows.metadata ->> 'accent', 'from-stone-700 via-stone-500 to-stone-200'),
      'notes', coalesce(asset_rows.metadata ->> 'notes', 'Ready for review.'),
      'instructions', asset_rows.metadata ->> 'instructions',
      'metadata', asset_rows.metadata,
      'createdAt', asset_rows.created_at,
      'updatedAt', asset_rows.updated_at,
      'versions', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', asset_versions.id,
            'assetId', asset_versions.asset_id,
            'reviewId', asset_versions.review_id,
            'label', asset_versions.label,
            'versionNumber', asset_versions.version_number,
            'sortOrder', asset_versions.sort_order,
            'sourceUrl', asset_versions.source_url,
            'originalName', asset_versions.metadata ->> 'originalName',
            'originalMimeType', asset_versions.metadata ->> 'originalMimeType',
            'originalBytes', nullif(asset_versions.metadata ->> 'originalBytes', '')::bigint,
            'previewUrl', asset_versions.preview_url,
            'thumbnailUrl', asset_versions.thumbnail_url,
            'previewMimeType', asset_versions.metadata ->> 'previewMimeType',
            'previewBytes', asset_versions.preview_bytes,
            'storagePath', asset_versions.storage_path,
            'thumbnailStoragePath', asset_versions.metadata ->> 'thumbnailStoragePath',
            'mimeType', asset_versions.mime_type,
            'width', asset_versions.width,
            'height', asset_versions.height,
            'pageNumber', nullif(asset_versions.metadata ->> 'pageNumber', '')::integer,
            'pageCount', asset_versions.page_count,
            'status', asset_versions.processing_status,
            'storageHint', asset_versions.metadata ->> 'storageHint',
            'metadata', asset_versions.metadata,
            'createdAt', asset_versions.created_at,
            'updatedAt', asset_versions.updated_at
          )
          order by asset_versions.sort_order
        )
        from public.asset_versions
        where asset_versions.asset_id = asset_rows.id
          and asset_versions.review_id = review_row.id
      ), '[]'::jsonb)
    )
    order by asset_rows.sort_order
  ), '[]'::jsonb)
  into assets_json
  from public.assets asset_rows
  where asset_rows.review_id = review_row.id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', comments.id,
      'reviewId', comments.review_id,
      'assetId', comments.asset_id,
      'assetVersionId', comments.asset_version_id,
      'optionId', comments.option_id,
      'parentCommentId', comments.parent_comment_id,
      'x', comments.x_percent,
      'y', comments.y_percent,
      'pageNumber', comments.page_number,
      'text', comments.body,
      'author', comments.author_name,
      'authorRole', comments.author_role,
      'status', comments.status,
      'resolvedAt', comments.resolved_at,
      'resolvedBy', comments.resolved_by,
      'createdAt', comments.created_at,
      'updatedAt', comments.updated_at,
      'replies', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', replies.id,
            'reviewId', replies.review_id,
            'assetId', replies.asset_id,
            'assetVersionId', replies.asset_version_id,
            'optionId', replies.option_id,
            'parentCommentId', replies.parent_comment_id,
            'text', replies.body,
            'author', replies.author_name,
            'authorRole', replies.author_role,
            'status', replies.status,
            'createdAt', replies.created_at,
            'updatedAt', replies.updated_at
          )
          order by replies.created_at
        )
        from public.comments replies
        where replies.parent_comment_id = comments.id
          and replies.review_id = review_row.id
      ), '[]'::jsonb)
    )
    order by comments.created_at
  ), '[]'::jsonb)
  into comments_json
  from public.comments
  where comments.review_id = review_row.id
    and comments.parent_comment_id is null;

  select body
  into latest_feedback
  from public.review_feedback
  where review_id = review_row.id
  order by created_at desc
  limit 1;

  select *
  into latest_decision
  from public.decisions
  where review_id = review_row.id
  order by created_at desc
  limit 1;

  return jsonb_build_object(
    'id', review_row.id,
    'shareToken', review_row.share_token,
    'title', review_row.title,
    'client', coalesce(review_row.client_name, ''),
    'instructions', review_row.instructions,
    'brief', jsonb_build_object(
      'message', review_row.brief_message,
      'focusPoints', to_jsonb(review_row.brief_focus_points),
      'requestedOutcome', review_row.brief_requested_outcome,
      'updatedAt', review_row.brief_updated_at
    ),
    'shareSettings', jsonb_build_object(
      'reviewerNameRequired', review_row.reviewer_name_required,
      'pinProtection', review_row.pin_protection_enabled,
      'allowComments', review_row.allow_comments,
      'allowDecisions', review_row.allow_decisions
    ),
    'assets', case
      when jsonb_array_length(assets_json) > 0 then assets_json
      else coalesce(review_row.content -> 'assets', '[]'::jsonb)
    end,
    'overallFeedback', coalesce(latest_feedback, review_row.content ->> 'overallFeedback', ''),
    'decision', coalesce(latest_decision.note, review_row.content ->> 'decision', ''),
    'decisionOutcome', case when latest_decision.id is null then coalesce(review_row.content -> 'decisionOutcome', 'null'::jsonb) else jsonb_build_object(
      'type', latest_decision.type,
      'note', latest_decision.note,
      'assetVersionId', coalesce(latest_decision.asset_version_id, latest_decision.option_id),
      'reviewerName', latest_decision.reviewer_name,
      'createdAt', latest_decision.created_at
    ) end,
    'selectedDirection', coalesce(latest_decision.asset_version_id, latest_decision.option_id, review_row.content ->> 'selectedDirection'),
    'selectedAssetVersionId', coalesce(latest_decision.asset_version_id, latest_decision.option_id, review_row.content ->> 'selectedAssetVersionId'),
    'comments', comments_json
  );
end;
$$;

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
  select * into review_row from public.reviews
  where share_token = p_share_token and status not in ('draft', 'archived');
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

create or replace function public.add_shared_comment(
  p_share_token text,
  p_comment_id text,
  p_review_id text,
  p_asset_id text,
  p_asset_version_id text,
  p_parent_comment_id text,
  p_author_name text,
  p_body text,
  p_x_percent numeric,
  p_y_percent numeric,
  p_page_number integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  matched_review public.reviews%rowtype;
begin
  select *
  into matched_review
  from public.reviews
  where id = p_review_id
    and share_token = p_share_token
    and status not in ('draft', 'approved', 'archived')
    and allow_comments;

  if not found then
    raise exception 'Shared review is not accepting comments.';
  end if;

  if p_asset_id is not null and not exists (
    select 1 from public.assets where id = p_asset_id and review_id = matched_review.id
  ) then
    raise exception 'Asset does not belong to shared review.';
  end if;

  if p_asset_version_id is not null and not exists (
    select 1 from public.asset_versions where id = p_asset_version_id and review_id = matched_review.id
  ) then
    raise exception 'Asset version does not belong to shared review.';
  end if;

  if p_parent_comment_id is not null and not exists (
    select 1 from public.comments where id = p_parent_comment_id and review_id = matched_review.id
  ) then
    raise exception 'Comment thread does not belong to shared review.';
  end if;

  insert into public.comments (
    id,
    review_id,
    asset_id,
    asset_version_id,
    parent_comment_id,
    author_name,
    author_role,
    body,
    x_percent,
    y_percent,
    page_number,
    status
  )
  values (
    p_comment_id,
    matched_review.id,
    p_asset_id,
    p_asset_version_id,
    p_parent_comment_id,
    nullif(trim(p_author_name), ''),
    'reviewer',
    nullif(trim(p_body), ''),
    p_x_percent,
    p_y_percent,
    p_page_number,
    'open'
  );
end;
$$;

create or replace function public.add_shared_feedback(
  p_share_token text,
  p_feedback_id text,
  p_review_id text,
  p_reviewer_name text,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  matched_review public.reviews%rowtype;
begin
  select *
  into matched_review
  from public.reviews
  where id = p_review_id
    and share_token = p_share_token
    and status not in ('draft', 'approved', 'archived')
    and allow_comments;

  if not found then
    raise exception 'Shared review is not accepting feedback.';
  end if;

  insert into public.review_feedback (id, review_id, reviewer_name, body)
  values (p_feedback_id, matched_review.id, nullif(trim(p_reviewer_name), ''), nullif(trim(p_body), ''));
end;
$$;

create or replace function public.add_shared_decision(
  p_share_token text,
  p_decision_id text,
  p_review_id text,
  p_asset_id text,
  p_asset_version_id text,
  p_reviewer_name text,
  p_type text,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  matched_review public.reviews%rowtype;
begin
  select *
  into matched_review
  from public.reviews
  where id = p_review_id
    and share_token = p_share_token
    and status not in ('draft', 'approved', 'archived')
    and allow_decisions;

  if not found then
    raise exception 'Shared review is not accepting decisions.';
  end if;

  if not exists (
    select 1 from public.assets where id = p_asset_id and review_id = matched_review.id
  ) then
    raise exception 'Deliverable does not belong to shared review.';
  end if;

  if p_asset_version_id is not null and not exists (
    select 1 from public.asset_versions where id = p_asset_version_id and asset_id = p_asset_id and review_id = matched_review.id
  ) then
    raise exception 'Version does not belong to deliverable.';
  end if;

  insert into public.decisions (
    id,
    review_id,
    asset_id,
    asset_version_id,
    reviewer_name,
    type,
    note
  )
  values (
    p_decision_id,
    matched_review.id,
    p_asset_id,
    p_asset_version_id,
    nullif(trim(p_reviewer_name), ''),
    p_type,
    coalesce(p_note, '')
  );
end;
$$;

alter table public.projects enable row level security;
alter table public.reviews enable row level security;
alter table public.review_options enable row level security;
alter table public.assets enable row level security;
alter table public.asset_versions enable row level security;
alter table public.comments enable row level security;
alter table public.decisions enable row level security;
alter table public.review_feedback enable row level security;

drop policy if exists "Shared active reviews can save feedback snapshot" on public.reviews;
drop policy if exists "Shared active reviews can sync options" on public.review_options;
drop policy if exists "Shared active reviews can update options" on public.review_options;
drop policy if exists "Shared active reviews can sync assets" on public.assets;
drop policy if exists "Shared active reviews can update assets" on public.assets;
drop policy if exists "Anyone with visible review can update own comment row" on public.comments;
drop policy if exists "Anyone with visible review can comment" on public.comments;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'projects' and policyname = 'Creators manage own projects') then
    create policy "Creators manage own projects" on public.projects
      for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reviews' and policyname = 'Creators manage own reviews') then
    create policy "Creators manage own reviews" on public.reviews
      for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reviews' and policyname = 'Shared reviews are readable') then
    create policy "Shared reviews are readable" on public.reviews
      for select using (status not in ('draft', 'archived'));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'review_options' and policyname = 'Visible options belong to visible reviews') then
    create policy "Visible options belong to visible reviews" on public.review_options
      for select using (exists (select 1 from public.reviews where reviews.id = review_options.review_id and reviews.status not in ('draft', 'archived')));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'review_options' and policyname = 'Creators manage options') then
    create policy "Creators manage options" on public.review_options
      for all using (exists (select 1 from public.reviews where reviews.id = review_options.review_id and reviews.owner_id = auth.uid()))
      with check (exists (select 1 from public.reviews where reviews.id = review_options.review_id and reviews.owner_id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'assets' and policyname = 'Visible assets belong to visible reviews') then
    create policy "Visible assets belong to visible reviews" on public.assets
      for select using (exists (select 1 from public.reviews where reviews.id = assets.review_id and reviews.status not in ('draft', 'archived')));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'assets' and policyname = 'Creators manage assets') then
    create policy "Creators manage assets" on public.assets
      for all using (exists (select 1 from public.reviews where reviews.id = assets.review_id and reviews.owner_id = auth.uid()))
      with check (exists (select 1 from public.reviews where reviews.id = assets.review_id and reviews.owner_id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'asset_versions' and policyname = 'Visible asset versions belong to visible reviews') then
    create policy "Visible asset versions belong to visible reviews" on public.asset_versions
      for select using (exists (select 1 from public.reviews where reviews.id = asset_versions.review_id and reviews.status not in ('draft', 'archived')));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'asset_versions' and policyname = 'Creators manage asset versions') then
    create policy "Creators manage asset versions" on public.asset_versions
      for all using (exists (select 1 from public.reviews where reviews.id = asset_versions.review_id and reviews.owner_id = auth.uid()))
      with check (exists (select 1 from public.reviews where reviews.id = asset_versions.review_id and reviews.owner_id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'comments' and policyname = 'Visible comments belong to visible reviews') then
    create policy "Visible comments belong to visible reviews" on public.comments
      for select using (exists (select 1 from public.reviews where reviews.id = comments.review_id and reviews.status not in ('draft', 'archived')));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'comments' and policyname = 'Anyone with visible review can comment') then
    create policy "Anyone with visible review can comment" on public.comments
      for insert with check (
        status = 'open'
        and resolved_at is null
        and resolved_by is null
        and exists (select 1 from public.reviews where reviews.id = comments.review_id and reviews.status not in ('draft', 'approved', 'archived') and reviews.allow_comments)
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'comments' and policyname = 'Creators manage comments') then
    create policy "Creators manage comments" on public.comments
      for all using (exists (select 1 from public.reviews where reviews.id = comments.review_id and reviews.owner_id = auth.uid()))
      with check (exists (select 1 from public.reviews where reviews.id = comments.review_id and reviews.owner_id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'decisions' and policyname = 'Visible decisions belong to visible reviews') then
    create policy "Visible decisions belong to visible reviews" on public.decisions
      for select using (exists (select 1 from public.reviews where reviews.id = decisions.review_id and reviews.status not in ('draft', 'archived')));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'decisions' and policyname = 'Anyone with visible review can decide') then
    create policy "Anyone with visible review can decide" on public.decisions
      for insert with check (exists (select 1 from public.reviews where reviews.id = decisions.review_id and reviews.status not in ('draft', 'approved', 'archived') and reviews.allow_decisions));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'review_feedback' and policyname = 'Visible feedback belongs to visible reviews') then
    create policy "Visible feedback belongs to visible reviews" on public.review_feedback
      for select using (exists (select 1 from public.reviews where reviews.id = review_feedback.review_id and reviews.status not in ('draft', 'archived')));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'review_feedback' and policyname = 'Anyone with visible review can leave feedback') then
    create policy "Anyone with visible review can leave feedback" on public.review_feedback
      for insert with check (exists (select 1 from public.reviews where reviews.id = review_feedback.review_id and reviews.status not in ('draft', 'approved', 'archived') and reviews.allow_comments));
  end if;
end
$$;

drop policy if exists "Shared reviews are readable" on public.reviews;
drop policy if exists "Visible options belong to visible reviews" on public.review_options;
drop policy if exists "Visible assets belong to visible reviews" on public.assets;
drop policy if exists "Visible asset versions belong to visible reviews" on public.asset_versions;
drop policy if exists "Visible comments belong to visible reviews" on public.comments;
drop policy if exists "Anyone with visible review can comment" on public.comments;
drop policy if exists "Visible decisions belong to visible reviews" on public.decisions;
drop policy if exists "Anyone with visible review can decide" on public.decisions;
drop policy if exists "Visible feedback belongs to visible reviews" on public.review_feedback;
drop policy if exists "Anyone with visible review can leave feedback" on public.review_feedback;

grant execute on function public.get_shared_review(text) to anon, authenticated;
grant execute on function public.get_shared_review_decision_context(text) to anon, authenticated;
grant execute on function public.add_shared_comment(text, text, text, text, text, text, text, text, numeric, numeric, integer) to anon, authenticated;
grant execute on function public.add_shared_feedback(text, text, text, text, text) to anon, authenticated;
grant execute on function public.add_shared_decision(text, text, text, text, text, text, text, text) to anon, authenticated;

drop policy if exists "Prototype can create shared reviews" on public.reviews;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-previews', 'review-previews', true, 15728640, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public can read review previews') then
    create policy "Public can read review previews" on storage.objects
      for select using (bucket_id = 'review-previews');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Authenticated creators upload review previews') then
    create policy "Authenticated creators upload review previews" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'review-previews');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Authenticated creators update review previews') then
    create policy "Authenticated creators update review previews" on storage.objects
      for update to authenticated
      using (bucket_id = 'review-previews')
      with check (bucket_id = 'review-previews');
  end if;
end
$$;

drop policy if exists "Prototype can upload review previews" on storage.objects;
drop policy if exists "Prototype can update review previews" on storage.objects;
