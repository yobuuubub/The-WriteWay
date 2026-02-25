// api/test-email/route.ts
// Test endpoint to check if email confirmation is working

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function isTestRouteAllowed(request: Request) {
  const enabled = process.env.ENABLE_TEST_ROUTES === 'true';
  const internalKey = process.env.INTERNAL_API_KEY;
  const requestKey = request.headers.get('x-internal-api-key');
  return enabled && !!internalKey && requestKey === internalKey;
}

export async function GET(request: Request) {
  try {
    if (process.env.NODE_ENV === 'production' || !isTestRouteAllowed(request)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Try to sign up a test user
    const testEmail = `test-${Date.now()}@example.com`;
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'testpass123',
    });

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        emailConfigured: false
      });
    }

    return NextResponse.json({
      success: true,
      userId: data.user?.id,
      email: testEmail,
      confirmed: !!data.user?.email_confirmed_at,
      confirmationSent: !!data.user?.confirmation_sent_at,
      message: 'Test signup completed. Check if confirmation email was sent.'
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
