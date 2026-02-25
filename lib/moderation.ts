// lib/moderation.ts
// Moderation logic, helper functions for AI-assisted and manual moderation.

import { supabase } from './supabase';
import { moderateContent, ModerationResult } from './ai';

export interface ModerationAction {
  action: 'flag' | 'approve' | 'remove';
  reason: string;
  moderatorId: string;
}

/**
 * Check if content should be flagged using AI moderation
 * Returns moderation result but never auto-deletes
 */
export async function checkContent(content: string): Promise<ModerationResult> {
  return await moderateContent(content);
}

/**
 * Flag a post for moderator review
 */
export async function flagPost(postId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .update({ flagged: true })
    .eq('id', postId);

  if (error) {
    throw new Error(`Failed to flag post: ${error.message}`);
  }

  // Log moderation action
  await logModerationAction({
    targetType: 'post',
    targetId: postId,
    action: 'flag',
    reason,
  });
}

/**
 * Approve a flagged post (remove flag)
 */
export async function approvePost(postId: string, moderatorId: string): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .update({ flagged: false })
    .eq('id', postId);

  if (error) {
    throw new Error(`Failed to approve post: ${error.message}`);
  }

  await logModerationAction({
    targetType: 'post',
    targetId: postId,
    action: 'approve',
    reason: 'Post approved by moderator',
    moderatorId,
  });
}

/**
 * Log a moderation action
 */
async function logModerationAction(params: {
  targetType: string;
  targetId: string;
  action: string;
  reason: string;
  moderatorId?: string;
}): Promise<void> {
  const { error } = await supabase.from('moderation_logs').insert([
    {
      target_type: params.targetType,
      target_id: params.targetId,
      action: params.action,
      reason: params.reason,
      moderator_id: params.moderatorId || null,
    },
  ]);

  if (error) {
    console.error('Failed to log moderation action:', error);
  }
}

/**
 * Get moderation logs for a moderator
 */
export async function getModerationLogs(moderatorId?: string) {
  let query = supabase.from('moderation_logs').select('*').order('created_at', { ascending: false });

  if (moderatorId) {
    query = query.eq('moderator_id', moderatorId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch moderation logs: ${error.message}`);
  }

  return data;
}
