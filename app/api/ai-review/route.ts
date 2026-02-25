import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { reviewArticleWithAI } from '../../../lib/ai-review';
import { stripHtmlToText } from '../../../lib/content-text';

type ReviewableArticle = {
  id: string;
  title: string;
  content: string;
  type: string;
  disclosure: string | null;
  status: string;
};

function isInternalRequest(request: NextRequest): boolean {
  const required = process.env.INTERNAL_API_KEY || '';
  if (!required) return false;
  const provided = request.headers.get('x-internal-api-key') || '';
  return provided === required;
}

export async function POST(request: NextRequest) {
  try {
    if (!isInternalRequest(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { article_id } = await request.json();
    const articleId = (article_id || '').toString();
    if (!articleId) {
      return NextResponse.json({ error: 'Missing article_id' }, { status: 400 });
    }

    const { data: articleData, error: fetchError } = await supabaseAdmin
      .from('articles')
      .select('id, title, content, type, disclosure, status')
      .eq('id', articleId)
      .single();
    const article = (articleData as ReviewableArticle | null) ?? null;

    if (fetchError || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    if (article.status !== 'pending_ai_review') {
      return NextResponse.json({ error: 'Article is not pending AI review' }, { status: 400 });
    }

    const reviewResult = await reviewArticleWithAI({
      title: article.title,
      content: stripHtmlToText(article.content || ''),
      article_type: article.type,
      disclosure: article.disclosure || '',
    });

    const updateData: Record<string, unknown> = {
      type: reviewResult.category,
      ai_status: reviewResult.decision,
      ai_feedback: reviewResult.feedback,
      status: reviewResult.decision === 'approved' ? 'approved' : reviewResult.decision,
    };
    if (reviewResult.decision === 'approved') {
      updateData.published_at = new Date().toISOString();
    }
    if (reviewResult.raw) {
      updateData.ai_raw_response = reviewResult.raw;
    }

    let { error: updateError } = await supabaseAdmin
      .from('articles')
      .update(updateData)
      .eq('id', article.id);

    if (updateError && (updateError as any)?.message?.includes("Could not find the 'ai_raw_response'")) {
      const retryPayload = { ...updateData };
      delete (retryPayload as any).ai_raw_response;
      const retry = await supabaseAdmin.from('articles').update(retryPayload).eq('id', article.id);
      updateError = retry.error || null;
    }

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
    }

    return NextResponse.json({
      decision: reviewResult.decision,
      category: reviewResult.category,
      feedback: reviewResult.feedback,
    });
  } catch (error: any) {
    console.error('AI review error:', error);
    return NextResponse.json(
      {
        decision: 'needs_revision',
        feedback: 'Unable to complete automated review due to a technical error. Please try again later.',
      },
      { status: 500 }
    );
  }
}
