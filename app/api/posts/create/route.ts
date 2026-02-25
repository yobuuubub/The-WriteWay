import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';
import { getRequestUserId } from '../../../../lib/server-auth';
import { checkContent } from '../../../../lib/moderation';

type Body = {
  discussionId?: string;
  content?: string;
};

function simpleSpamCheck(text: string) {
  const lower = text.toLowerCase();
  const reasons: string[] = [];

  // Too short
  if (text.trim().length < 30) reasons.push('too_short');

  // Many links
  const urlCount = (text.match(/https?:\/\//g) || []).length;
  if (urlCount > 2) reasons.push('too_many_links');

  // Repeated characters (spammy)
  if (/(.)\1{12,}/.test(text)) reasons.push('repeated_characters');

  // Simple blacklisted phrases
  const blacklist = ['buy now', 'click here', 'free money', 'subscribe now'];
  for (const p of blacklist) if (lower.includes(p)) reasons.push('blacklist_phrase');

  return { flagged: reasons.length > 0, reasons };
}

function wordCount(text: string): number {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (!normalized) return 0;
  return normalized.split(' ').length;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getRequestUserId(req);
    if (!auth.userId) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await req.json()) as Body;
    const discussionId = (body?.discussionId || '').toString();
    const content = (body?.content || '').toString().trim();
    const maxPerDay = 2;

    if (!discussionId || !content) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const words = wordCount(content);
    if (words > 300) {
      return NextResponse.json({ error: 'Post must be 300 words or fewer' }, { status: 400 });
    }
    if (content.length < 30) {
      return NextResponse.json({ error: 'Post is too short' }, { status: 400 });
    }

    const { data: discussion } = await supabaseAdmin
      .from('discussions')
      .select('id')
      .eq('id', discussionId)
      .maybeSingle();
    if (!discussion?.id) {
      return NextResponse.json({ error: 'Discussion not found' }, { status: 404 });
    }

    const now = new Date();
    const dayAgo = new Date(now);
    dayAgo.setHours(0, 0, 0, 0);

    // Rate limit: count today's posts by this author
    const { count } = await supabaseAdmin
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', auth.userId)
      .gte('created_at', dayAgo.toISOString());

    if ((count || 0) >= maxPerDay) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Spam heuristics
    const spam = simpleSpamCheck(content);
    if (spam.flagged) {
      // Insert but mark flagged=true so moderators can review
      const { data, error } = await supabaseAdmin
        .from('posts')
        .insert([
          { discussion_id: discussionId, author_id: auth.userId, content, flagged: true },
        ])
        .select()
        .single();

      if (error) return NextResponse.json({ error: 'DB insert failed' }, { status: 500 });

      // Log moderation reasons (best-effort)
      try {
        await supabaseAdmin.from('moderation_logs').insert([
          {
            target_type: 'post',
            target_id: data.id,
            action: 'flag',
            reason: JSON.stringify(spam.reasons),
            moderator_id: null,
          },
        ]);
      } catch {
        // ignore
      }

      return NextResponse.json({ flagged: true, reason: spam.reasons, post: data });
    }

    // Insert normally
    const { data, error } = await supabaseAdmin
      .from('posts')
      .insert([
        { discussion_id: discussionId, author_id: auth.userId, content, flagged: false },
      ])
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'DB insert failed' }, { status: 500 });

    // Fire moderation check asynchronously (best-effort)
    try {
      const aiModeration = await checkContent(content);
      if (aiModeration.flagged) {
        await supabaseAdmin.from('posts').update({ flagged: true }).eq('id', data.id);
        await supabaseAdmin.from('moderation_logs').insert([
          {
            target_type: 'post',
            target_id: data.id,
            action: 'flag',
            reason: aiModeration.reason || 'ai_moderation_flag',
            moderator_id: null,
          },
        ]);
        return NextResponse.json({ flagged: true, reason: [aiModeration.reason || 'flagged'], post: data });
      }
    } catch {
      // ignore moderation errors; post creation already succeeded
    }

    return NextResponse.json({ flagged: false, post: data });
  } catch (err: any) {
    console.error('Create post API error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
