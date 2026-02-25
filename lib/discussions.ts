// lib/discussions.ts
// Helper functions for creating and managing discussions

import { supabase } from './supabase';

/**
 * Create a discussion for an article
 * Should be called when an article is published
 */
export async function createDiscussionForArticle(
  articleId: string,
  guidingQuestion: string
): Promise<string> {
  const { data, error } = await supabase
    .from('discussions')
    .insert([
      {
        article_id: articleId,
        guiding_question: guidingQuestion,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create discussion: ${error.message}`);
  }

  return data.id;
}

/**
 * Get discussion for an article
 */
export async function getDiscussionForArticle(articleId: string) {
  const { data, error } = await supabase
    .from('discussions')
    .select('*')
    .eq('article_id', articleId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "not found" which is okay
    throw new Error(`Failed to get discussion: ${error.message}`);
  }

  return data;
}
