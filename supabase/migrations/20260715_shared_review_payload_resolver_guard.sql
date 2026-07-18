-- The legacy payload may only be returned for an access mode approved by the
-- canonical resolver. This prevents Project-only Reviews bypassing membership.
drop function if exists public.get_shared_review_secure(text);
create or replace function public.get_shared_review_secure(p_share_token text, p_access_code text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare access jsonb;
begin
  access := public.resolve_review_access(p_share_token, p_access_code);
  if coalesce(access ->> 'mode', 'denied') = 'denied' then return null; end if;
  return public.get_shared_review(p_share_token);
end; $$;
grant execute on function public.get_shared_review_secure(text, text) to anon, authenticated;
