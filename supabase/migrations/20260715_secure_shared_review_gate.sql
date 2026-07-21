-- Gate the legacy shared-review payload behind lifecycle and sharing checks.
create or replace function public.get_shared_review_secure(p_share_token text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.reviews%rowtype;
begin
  select * into r from public.reviews where share_token = p_share_token and sharing_enabled and lifecycle in ('open','closed','archived');
  if not found then return null; end if;
  return public.get_shared_review(p_share_token);
end; $$;
revoke execute on function public.get_shared_review(text) from anon, authenticated;
grant execute on function public.get_shared_review_secure(text) to anon, authenticated;
