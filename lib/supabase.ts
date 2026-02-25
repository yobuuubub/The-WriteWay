// lib/supabase.ts
// Initializes and exports the Supabase client using environment variables for use in a Next.js 14 App Router app.

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const missingClientEnvMessage =
  'Missing Supabase environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.';

type AppSupabaseClient = SupabaseClient<any, 'public', any>;

function unavailableClient(): AppSupabaseClient {
  // Defer env failures until runtime usage so build-time analysis does not crash.
  return new Proxy({} as AppSupabaseClient, {
    get() {
      throw new Error(missingClientEnvMessage);
    },
  });
}

export const supabase: AppSupabaseClient =
  supabaseUrl && supabaseAnonKey ? createClient<any>(supabaseUrl, supabaseAnonKey) : unavailableClient();
