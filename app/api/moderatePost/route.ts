import { NextRequest, NextResponse } from 'next/server';
import { checkContent } from '../../../lib/moderation';
import { supabaseAdmin } from '../../../lib/supabase-admin';

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

    const { postId, content } = await request.json();
    const targetPostId = (postId || '').toString();
    const targetContent = (content || '').toString();

    if (!targetPostId || !targetContent) {
      return NextResponse.json({ error: 'Missing postId or content' }, { status: 400 });
    }

    const moderationResult = await checkContent(targetContent);
    if (!moderationResult.flagged) {
      return NextResponse.json({
        flagged: false,
        action: 'approved',
        message: 'Post approved',
      });
    }

    const { error } = await supabaseAdmin
      .from('posts')
      .update({ flagged: true })
      .eq('id', targetPostId);

    if (error) {
      return NextResponse.json({ error: 'Failed to flag post' }, { status: 500 });
    }

    await supabaseAdmin.from('moderation_logs').insert([
      {
        target_type: 'post',
        target_id: targetPostId,
        action: 'flag',
        reason: moderationResult.reason || 'ai_moderation_flag',
        moderator_id: null,
      },
    ]);

    return NextResponse.json({
      flagged: true,
      reason: moderationResult.reason || null,
      action: 'flagged_for_review',
      message: 'Post flagged for moderator review.',
    });
  } catch (error: any) {
    console.error('Moderation error:', error);
    return NextResponse.json(
      { error: error.message || 'Moderation failed' },
      { status: 500 }
    );
  }
}
