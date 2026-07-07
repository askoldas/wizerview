#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Za-z0-9_]+)=(.*)$/);
    if (!m) return;
    const k = m[1];
    let v = m[2] || '';
    v = v.replace(/^"|"$/g, '');
    process.env[k] = v;
  });
}

(async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const envPath = path.join(repoRoot, '.env.local');
  loadEnvFile(envPath);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('Missing Supabase credentials in .env.local. Aborting.');
    process.exit(1);
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY is not set. Seed writes may fail when RLS is enabled.');
  }

  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const seedPath = path.join(repoRoot, 'supabase', 'initial-reviews.json');
  const schemaPath = path.join(repoRoot, 'supabase', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    console.log('Schema file available at', schemaPath);
  }
  if (!fs.existsSync(seedPath)) {
    console.error('Seed file not found:', seedPath);
    process.exit(1);
  }

  const reviews = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

  for (const r of reviews) {
    console.log('Upserting review', r.id);
    const { error } = await client.from('reviews').upsert({
      id: r.id,
      title: r.title,
      client_name: r.client,
      instructions: r.instructions,
      status: 'in_review',
      reviewer_name_required: Boolean(r.shareSettings && r.shareSettings.reviewerNameRequired),
      pin_protection_enabled: Boolean(r.shareSettings && r.shareSettings.pinProtection),
      allow_comments: r.shareSettings ? Boolean(r.shareSettings.allowComments) : true,
      allow_decisions: r.shareSettings ? Boolean(r.shareSettings.allowDecisions) : true,
      content: r,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error('Failed to upsert', r.id, error.message);
      console.error('If this says the table is missing, run the SQL in supabase/schema.sql in the Supabase SQL editor first.');
      process.exitCode = 1;
      continue;
    }
    console.log('Upserted', r.id);
  }

  if (process.exitCode) {
    process.exit(process.exitCode);
  }

  // quick verify select
  const { data, error } = await client.from('reviews').select('id, updated_at').in('id', reviews.map((x) => x.id));
  if (error) {
    console.error('Verification select failed:', error.message);
    process.exit(1);
  }
  console.log('Verified rows:', data);
})();
