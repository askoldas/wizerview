import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type SupabaseBrowserGlobal = typeof globalThis & {
  __wizerviewSupabaseClient__?: SupabaseClient;
};

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function createSupabaseClientInstance(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;

  if (typeof window === 'undefined') {
    return createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  const browserGlobal = globalThis as SupabaseBrowserGlobal;

  if (!browserGlobal.__wizerviewSupabaseClient__) {
    browserGlobal.__wizerviewSupabaseClient__ = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return browserGlobal.__wizerviewSupabaseClient__;
}
