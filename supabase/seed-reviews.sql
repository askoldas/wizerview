create table if not exists public.reviews (
  id text primary key,
  content jsonb not null,
  updated_at timestamptz default now()
);

alter table public.reviews enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'reviews'
      and policyname = 'Allow public read access'
  ) then
    create policy "Allow public read access" on public.reviews
      for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'reviews'
      and policyname = 'Allow public write access'
  ) then
    create policy "Allow public write access" on public.reviews
      for insert with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'reviews'
      and policyname = 'Allow public update access'
  ) then
    create policy "Allow public update access" on public.reviews
      for update using (true) with check (true);
  end if;
end
$$;

insert into public.reviews (id, content, updated_at)
values (
  '1',
  '{
    "id": "1",
    "title": "Homepage Direction",
    "client": "Acme Studio",
    "instructions": "Please compare the homepage directions, leave notes, and select the strongest direction.",
    "shareSettings": {
      "reviewerNameRequired": true,
      "pinProtection": false,
      "allowComments": true,
      "allowDecisions": true
    },
    "options": [
      {
        "id": "main-option",
        "title": "Main option",
        "description": "A calm, premium homepage concept for the launch.",
        "assets": [
          {
            "id": "desktop-home",
            "title": "Homepage desktop",
            "kind": "screenshot",
            "description": "A polished desktop hero with rich whitespace and a clear CTA.",
            "accent": "from-stone-800 via-stone-600 to-stone-300",
            "notes": "The hierarchy feels calm and premium."
          },
          {
            "id": "mobile-home",
            "title": "Homepage mobile",
            "kind": "screenshot",
            "description": "A compact mobile experience with a stronger proof stack.",
            "accent": "from-stone-700 via-orange-200 to-stone-100",
            "notes": "Good rhythm and strong product storytelling."
          },
          {
            "id": "logo-h",
            "title": "Logo horizontal",
            "kind": "image",
            "description": "A wide lockup for the header and hero area.",
            "accent": "from-slate-800 via-slate-600 to-slate-300",
            "notes": "The spacing feels balanced."
          },
          {
            "id": "pdf-preview",
            "title": "Brand page preview",
            "kind": "pdf",
            "description": "A faux PDF page set for the supporting brand story.",
            "accent": "from-slate-700 via-slate-500 to-slate-200",
            "notes": "The page flow is easy to skim."
          }
        ]
      }
    ],
    "overallFeedback": "",
    "decision": "",
    "selectedDirection": null,
    "comments": [
      {
        "id": "comment-1",
        "assetId": "desktop-home",
        "x": 28,
        "y": 36,
        "text": "The hero section feels confident without being loud.",
        "author": "Mina"
      },
      {
        "id": "comment-2",
        "assetId": "pdf-preview",
        "x": 42,
        "y": 54,
        "text": "The supporting page feels a little too dense.",
        "author": "Jules"
      }
    ]
  }'::jsonb,
  now()
)
on conflict (id) do update
set content = excluded.content,
    updated_at = excluded.updated_at;
