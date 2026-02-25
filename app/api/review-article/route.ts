import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { reviewArticleWithAI } from '../../../lib/ai-review';
import { stripHtmlToText } from '../../../lib/content-text';
import { getRequestUserId } from '../../../lib/server-auth';

type Role = 'reader' | 'contributor' | 'editor' | 'moderator' | 'admin';

const ALLOWED_REVIEWER_ROLES: Role[] = ['editor', 'moderator', 'admin'];

async function isAuthorizedReviewer(request: NextRequest): Promise<boolean> {
  const internalKey = process.env.INTERNAL_API_KEY || '';
  const providedInternalKey = request.headers.get('x-internal-api-key') || '';
  if (internalKey && providedInternalKey && providedInternalKey === internalKey) {
    return true;
  }

  const auth = await getRequestUserId(request);
  if (!auth.userId) return false;

  const { data } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', auth.userId)
    .maybeSingle();

  const role = (data?.role || 'reader') as Role;
  return ALLOWED_REVIEWER_ROLES.includes(role);
}

export async function POST(request: NextRequest) {
  try {
    const authorized = await isAuthorizedReviewer(request);
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { articleId } = await request.json();
    const targetId = (articleId || '').toString();
    if (!targetId) {
      return NextResponse.json({ error: 'Missing articleId' }, { status: 400 });
    }

    const { data: article, error: fetchErr } = await supabaseAdmin
      .from('articles')
      .select('id, title, content, type, disclosure, status')
      .eq('id', targetId)
      .single();

    if (fetchErr || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    if (article.status !== 'pending_ai_review') {
      return NextResponse.json(
        { error: 'Article is not pending AI review' },
        { status: 400 }
      );
    }

    const aiResult = await reviewArticleWithAI({
      title: article.title,
      content: stripHtmlToText(article.content || ''),
      article_type: article.type,
      disclosure: article.disclosure || '',
    });

    const decision = aiResult.decision;
    const updateData: Record<string, unknown> = {
      type: aiResult.category,
      ai_status: decision,
      ai_feedback: aiResult.feedback,
      status: decision === 'approved' ? 'approved' : decision,
    };
    if (decision === 'approved') {
      updateData.published_at = new Date().toISOString();
    }
    if (aiResult.raw) {
      updateData.ai_raw_response = aiResult.raw;
    }

    let { error: updateErr } = await supabaseAdmin
      .from('articles')
      .update(updateData)
      .eq('id', targetId);

    if (updateErr && (updateErr as any)?.message?.includes("Could not find the 'ai_raw_response'")) {
      const retryPayload = { ...updateData };
      delete (retryPayload as any).ai_raw_response;
      const retry = await supabaseAdmin.from('articles').update(retryPayload).eq('id', targetId);
      updateErr = retry.error || null;
    }

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
    }

    return NextResponse.json({
      decision,
      category: aiResult.category,
      feedback: aiResult.feedback,
    });
  } catch (err: any) {
    console.error('review-article route error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
