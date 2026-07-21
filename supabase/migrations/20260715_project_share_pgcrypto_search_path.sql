-- Secure project-sharing RPCs use pgcrypto for optional access-code checks.
-- Their restricted search_path must include Supabase's extensions schema.
create extension if not exists pgcrypto with schema extensions;

alter function public.get_shared_project(text, text)
  set search_path = public, extensions, pg_temp;

alter function public.set_project_access_code(uuid, text)
  set search_path = public, extensions, pg_temp;

alter function public.get_shared_project_request(text, text, text)
  set search_path = public, extensions, pg_temp;

alter function public.add_shared_project_request_message(text, text, text, text, text, text)
  set search_path = public, extensions, pg_temp;

alter function public.add_shared_project_request_link(text, text, text, text, text, text, text, text)
  set search_path = public, extensions, pg_temp;
