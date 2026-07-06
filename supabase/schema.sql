create table if not exists public.reviews (
  id text primary key,
  content jsonb not null,
  updated_at timestamptz default now()
);

alter table public.reviews enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'reviews' and policyname = 'Allow public read access'
  ) then
    create policy "Allow public read access" on public.reviews
      for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'reviews' and policyname = 'Allow public write access'
  ) then
    create policy "Allow public write access" on public.reviews
      for insert with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'reviews' and policyname = 'Allow public update access'
  ) then
    create policy "Allow public update access" on public.reviews
      for update using (true) with check (true);
  end if;
end
$$;
