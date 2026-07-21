-- Project Requests created from the client portal retain the authenticated
-- client identity and immutable display-name snapshot.
create or replace function public.apply_authenticated_project_request_author()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_name text;
begin
  if auth.uid() is not null then
    select display_name into v_name from public.profiles where user_id = auth.uid();
    new.requested_by_user_id := auth.uid();
    new.requested_by_name_snapshot := coalesce(nullif(trim(v_name), ''), new.requested_by_name, 'Client');
    new.requested_by_name := new.requested_by_name_snapshot;
  else
    new.requested_by_name_snapshot := coalesce(new.requested_by_name_snapshot, new.requested_by_name, 'Client');
  end if;
  return new;
end; $$;

drop trigger if exists apply_authenticated_project_request_author on public.project_requests;
create trigger apply_authenticated_project_request_author before insert on public.project_requests
for each row execute function public.apply_authenticated_project_request_author();
