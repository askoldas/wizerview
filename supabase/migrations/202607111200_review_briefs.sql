alter table public.reviews add column if not exists brief_message text not null default '';
alter table public.reviews add column if not exists brief_focus_points text[] not null default '{}'::text[];
alter table public.reviews add column if not exists brief_requested_outcome text not null default '';
alter table public.reviews add column if not exists brief_updated_at timestamptz;

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
    'selectedDirection', coalesce(latest_decision.asset_version_id, latest_decision.option_id, review_row.content ->> 'selectedDirection'),
    'selectedAssetVersionId', coalesce(latest_decision.asset_version_id, latest_decision.option_id, review_row.content ->> 'selectedAssetVersionId'),
    'comments', comments_json
  );
end;
$$;

grant execute on function public.get_shared_review(text) to anon, authenticated;
