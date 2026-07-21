-- Creator-only lifecycle transitions. Sharing remains independent.
create or replace function public.set_review_lifecycle(p_review_id text, p_lifecycle text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_lifecycle not in ('draft','open','closed','archived') then raise exception 'Invalid review lifecycle.'; end if;
  if not exists (select 1 from public.reviews where id = p_review_id and owner_id = auth.uid()) then raise exception 'Review not found.'; end if;
  update public.reviews set lifecycle = p_lifecycle, status = case when p_lifecycle = 'draft' then 'draft' when p_lifecycle = 'archived' then 'archived' else status end, updated_at = now(), last_activity_at = now() where id = p_review_id;
end; $$;

create or replace function public.set_project_lifecycle(p_project_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_status not in ('active','completed','archived') then raise exception 'Invalid project lifecycle.'; end if;
  if not exists (select 1 from public.projects where id = p_project_id and owner_id = auth.uid()) then raise exception 'Project not found.'; end if;
  update public.projects set status = p_status, archived_at = case when p_status = 'archived' then coalesce(archived_at, now()) else null end, updated_at = now(), last_activity_at = now() where id = p_project_id;
end; $$;
grant execute on function public.set_review_lifecycle(text, text) to authenticated;
grant execute on function public.set_project_lifecycle(uuid, text) to authenticated;
