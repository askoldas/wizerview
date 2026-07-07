insert into public.reviews (
  id,
  title,
  client_name,
  instructions,
  status,
  reviewer_name_required,
  pin_protection_enabled,
  allow_comments,
  allow_decisions,
  content,
  updated_at
)
values (
  '1',
  'Homepage Direction',
  'Acme Studio',
  'Please compare the homepage directions, leave notes, and select the strongest direction.',
  'in_review',
  true,
  false,
  true,
  true,
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
        "id": "option-a",
        "title": "Option A",
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
        "text": "The hero area feels confident without being loud.",
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
set title = excluded.title,
    client_name = excluded.client_name,
    instructions = excluded.instructions,
    status = excluded.status,
    reviewer_name_required = excluded.reviewer_name_required,
    pin_protection_enabled = excluded.pin_protection_enabled,
    allow_comments = excluded.allow_comments,
    allow_decisions = excluded.allow_decisions,
    content = excluded.content,
    updated_at = excluded.updated_at;
