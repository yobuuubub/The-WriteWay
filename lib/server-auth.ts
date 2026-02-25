import { NextRequest } from 'next/server';
import { supabaseAdmin } from './supabase-admin';

export function getBearerToken(request: NextRequest): string {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return '';
  return authHeader.slice(7).trim();
}

export async function getRequestUserId(request: NextRequest): Promise<{
  userId: string | null;
  error: string | null;
  status: number;
}> {
  const token = getBearerToken(request);
  if (!token) {
    return { userId: null, error: 'Missing auth token.', status: 401 };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user?.id) {
    return { userId: null, error: 'Invalid session.', status: 401 };
  }

  return { userId: data.user.id, error: null, status: 200 };
}
