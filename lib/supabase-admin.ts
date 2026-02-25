// lib/supabase-admin.ts
// Server-only Supabase client using the service role key. Bypasses RLS.
// Use only in API routes or server code. Never expose this client to the browser.

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const missingAdminEnvMessage =
  'Missing Supabase admin env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.';

type SupabaseAdminClient = SupabaseClient<any, 'public', any>;

function unavailableAdminClient(): SupabaseAdminClient {
  // Defer env failures until runtime usage so build-time route analysis does not crash.
  return new Proxy({} as SupabaseAdminClient, {
    get() {
      throw new Error(missingAdminEnvMessage);
    },
  });
}

export const supabaseAdmin: SupabaseAdminClient =
  supabaseUrl && serviceRoleKey
    ? createClient<any>(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : unavailableAdminClient();
