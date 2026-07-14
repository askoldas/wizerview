-- Activity is append-only; creator read state is scoped and never cleared by dashboard load.
alter table public.activity_events enable row level security;
alter table public.activity_reads enable row level security;
create policy "Creators read own activity" on public.activity_events for select using (exists (select 1 from public.projects p where p.id = activity_events.project_id and p.owner_id = auth.uid()) or exists (select 1 from public.reviews r where r.id = activity_events.review_id and r.owner_id = auth.uid()));
create policy "Creators manage own activity reads" on public.activity_reads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create or replace function public.mark_activity_scope_seen(p_scope_type text, p_scope_id text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.activity_reads(user_id, scope_type, scope_id, last_seen_at) values (auth.uid(), p_scope_type, p_scope_id, now()) on conflict(user_id, scope_type, scope_id) do update set last_seen_at = excluded.last_seen_at;
end; $$;
grant execute on function public.mark_activity_scope_seen(text, text) to authenticated;
