import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { reviewArticleWithAI } from '../../../lib/ai-review';
import { stripHtmlToText } from '../../../lib/content-text';
import { getRequestUserId } from '../../../lib/server-auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await getRequestUserId(request);
    if (!auth.userId) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { data: pendingArticles, error: fetchError } = await supabaseAdmin
      .from('articles')
      .select('id, title, content, type, disclosure')
      .eq('author_id', auth.userId)
      .eq('status', 'pending_ai_review')
      .order('created_at', { ascending: false })
      .limit(25);

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch pending articles' }, { status: 500 });
    }

    if (!pendingArticles || pendingArticles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No articles pending AI review',
        reviewed: 0,
      });
    }

    const results: Array<{ id: string; title: string; category: string; decision: string; status: string }> = [];

    for (const article of pendingArticles) {
      try {
        const aiResult = await reviewArticleWithAI({
          title: article.title,
          content: stripHtmlToText(article.content || ''),
          article_type: article.type,
          disclosure: article.disclosure || '',
        });

        const nextStatus =
          aiResult.decision === 'approved'
            ? 'approved'
            : aiResult.decision === 'needs_revision'
              ? 'needs_revision'
              : 'rejected';

        const updatePayload: Record<string, unknown> = {
          type: aiResult.category,
          status: nextStatus,
          ai_status: aiResult.decision,
          ai_feedback: aiResult.feedback,
        };
        if (nextStatus === 'approved') {
          updatePayload.published_at = new Date().toISOString();
        }
        if (aiResult.raw) {
          updatePayload.ai_raw_response = aiResult.raw;
        }

        let { error: updateError } = await supabaseAdmin
          .from('articles')
          .update(updatePayload)
          .eq('id', article.id);

        if (updateError && (updateError as any)?.message?.includes("Could not find the 'ai_raw_response'")) {
          const retryPayload = { ...updatePayload };
          delete (retryPayload as any).ai_raw_response;
          const retry = await supabaseAdmin.from('articles').update(retryPayload).eq('id', article.id);
          updateError = retry.error || null;
        }

        if (!updateError) {
          results.push({
            id: article.id,
            title: article.title,
            category: aiResult.category,
            decision: aiResult.decision,
            status: nextStatus,
          });
        }
      } catch (error) {
        console.error(`Error reviewing article ${article.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Reviewed ${results.length} out of ${pendingArticles.length} pending articles`,
      reviewed: results.length,
      total: pendingArticles.length,
      results,
    });
  } catch (error: any) {
    console.error('Manual review trigger error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to trigger AI review' },
      { status: 500 }
    );
  }
}
