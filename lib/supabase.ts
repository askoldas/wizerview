import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type SupabaseBrowserGlobal = typeof globalThis & {
  __wizerviewSupabaseClient__?: SupabaseClient;
};

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function createSupabaseClientInstance(): SupabaseClient | null {
  if (!isSupabaseConfigured() || typeof window === 'undefined') return null;

  const browserGlobal = globalThis as SupabaseBrowserGlobal;

  if (!browserGlobal.__wizerviewSupabaseClient__) {
    browserGlobal.__wizerviewSupabaseClient__ = createBrowserClient(supabaseUrl!, supabaseAnonKey!);
  }

  return browserGlobal.__wizerviewSupabaseClient__;
}
