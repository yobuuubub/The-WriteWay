// lib/social.ts
// Client-side helpers for profiles, follows, collections, and notifications.

import { supabase } from './supabase';
import type { Collection, Notification } from '../types/social';
import type { User } from '../types/user';

export async function fetchProfileByHandle(handle: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, display_name, handle, bio, avatar_url, cover_url, tagline, role, age_range, country, created_at')
    .ilike('handle', handle)
    .maybeSingle();
  if (error) return null;
  return data as User;
}

export async function fetchFollowCounts(userId: string) {
  const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('writer_id', userId),
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);
  return {
    followerCount: followerCount || 0,
    followingCount: followingCount || 0,
  };
}

export async function fetchFollowStatus(followerId: string, writerId: string) {
  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('writer_id', writerId)
    .maybeSingle();
  return !!data;
}

export async function followWriter(followerId: string, writerId: string) {
  return supabase.from('follows').insert([{ follower_id: followerId, writer_id: writerId }]);
}

export async function unfollowWriter(followerId: string, writerId: string) {
  return supabase.from('follows').delete().eq('follower_id', followerId).eq('writer_id', writerId);
}

export async function fetchCollections(ownerId: string, includePrivate: boolean) {
  let query = supabase
    .from('collections')
    .select('id, owner_id, title, description, visibility, created_at, updated_at')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (!includePrivate) {
    query = query.in('visibility', ['public', 'unlisted']);
  }
  const { data } = await query;
  return (data as Collection[]) || [];
}

export async function ensurePrimaryCollection(ownerId: string) {
  const { data } = await supabase
    .from('collections')
    .select('id, owner_id, title, description, visibility, created_at, updated_at')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true });

  if (!data || data.length === 0) {
    const { data: created } = await createCollection({
      owner_id: ownerId,
      title: 'Saved',
      visibility: 'private',
    });
    return (created as Collection) || null;
  }

  const primary = data[0] as Collection;
  if (primary.title !== 'Saved') {
    await supabase.from('collections').update({ title: 'Saved' }).eq('id', primary.id);
  }
  return primary;
}

export async function fetchCollectionItemCount(collectionId: string) {
  const { count } = await supabase
    .from('collection_items')
    .select('id', { count: 'exact', head: true })
    .eq('collection_id', collectionId);
  return count || 0;
}

export async function createCollection(payload: {
  owner_id: string;
  title: string;
  description?: string;
  visibility?: Collection['visibility'];
}) {
  return supabase
    .from('collections')
    .insert([
      {
        owner_id: payload.owner_id,
        title: payload.title,
        description: payload.description || null,
        visibility: payload.visibility || 'private',
      },
    ])
    .select('*')
    .single();
}

export async function updateCollection(collectionId: string, updates: Partial<Collection>) {
  return supabase.from('collections').update(updates).eq('id', collectionId).select('*').single();
}

export async function removeCollection(collectionId: string) {
  return supabase.from('collections').delete().eq('id', collectionId);
}

export async function addToCollection(collectionId: string, articleId: string) {
  return supabase
    .from('collection_items')
    .insert([{ collection_id: collectionId, article_id: articleId }])
    .select('*')
    .single();
}

export async function removeFromCollection(collectionId: string, articleId: string) {
  return supabase
    .from('collection_items')
    .delete()
    .eq('collection_id', collectionId)
    .eq('article_id', articleId);
}

export async function fetchNotifications(userId: string) {
  const { data } = await supabase
    .from('notifications')
    .select('id, user_id, actor_id, article_id, type, is_read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return (data as Notification[]) || [];
}

export async function markNotificationsRead(ids: string[]) {
  if (ids.length === 0) return;
  return supabase.from('notifications').update({ is_read: true }).in('id', ids);
}
