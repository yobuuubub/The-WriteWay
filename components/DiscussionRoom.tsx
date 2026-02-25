"use client";
// components/DiscussionRoom.tsx
// Threaded discussion component for articles

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { useUser } from "../lib/auth";
import { Article } from "../types/article";

interface DiscussionPost {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
  flagged: boolean;
  author_name?: string;
}

interface DiscussionRoomProps {
  articleId: string;
  article: Article;
}

export default function DiscussionRoom({ articleId, article }: DiscussionRoomProps) {
  const { user } = useUser();
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [discussionId, setDiscussionId] = useState<string | null>(null);

  useEffect(() => {
    async function loadDiscussion() {
      setLoading(true);

      let { data: discussion } = await supabase
        .from("discussions")
        .select("id")
        .eq("article_id", articleId)
        .single();

      if (!discussion) {
        const { data: newDiscussion } = await supabase
          .from("discussions")
          .insert({
            article_id: articleId,
            guiding_question: `What are your thoughts on "${article.title}"?`,
          })
          .select("id")
          .single();

        if (newDiscussion) discussion = newDiscussion;
      }

      if (discussion) {
        setDiscussionId(discussion.id);

        const { data: postsData } = await supabase
          .from("posts")
          .select(`
            id,
            content,
            author_id,
            created_at,
            flagged,
            users!inner(display_name)
          `)
          .eq("discussion_id", discussion.id)
          .eq("flagged", false)
          .order("created_at", { ascending: true });

        if (postsData) {
          const formattedPosts = postsData.map((post: any) => ({
            ...post,
            author_name: post.users?.display_name || "Anonymous",
          }));
          setPosts(formattedPosts);
        }
      }

      setLoading(false);
    }

    if (articleId) loadDiscussion();
  }, [articleId, article.title]);

  async function handleSubmitPost(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !discussionId || !newPost.trim()) return;

    setSubmitting(true);

    const { error } = await supabase.from("posts").insert({
      discussion_id: discussionId,
      author_id: user.id,
      content: newPost.trim(),
    });

    if (!error) {
      const { data: postsData } = await supabase
        .from("posts")
        .select(`
          id,
          content,
          author_id,
          created_at,
          flagged,
          users!inner(display_name)
        `)
        .eq("discussion_id", discussionId)
        .eq("flagged", false)
        .order("created_at", { ascending: true });

      if (postsData) {
        const formattedPosts = postsData.map((post: any) => ({
          ...post,
          author_name: post.users?.display_name || "Anonymous",
        }));
        setPosts(formattedPosts);
      }

      setNewPost("");
    }

    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-charcoal/10 bg-white/95 shadow-soft p-8">
        <div className="animate-pulse">
          <div className="h-4 bg-charcoal/10 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-charcoal/10 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-charcoal/10 bg-white/95 shadow-soft overflow-hidden">
      <div className="bg-paper-warm px-6 py-4 border-b border-charcoal/10">
        <h3 className="font-display text-lg text-charcoal mb-1">Discussion: {article.title}</h3>
        <p className="text-sm text-charcoal/70">Share your thoughts and engage with other readers</p>
      </div>

      <div className="max-h-96 overflow-y-auto p-6 space-y-4">
        {posts.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-4 text-charcoal/50">...</div>
            <p className="text-charcoal/60">No discussions yet. Be the first to share your thoughts.</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-paper/70 rounded-xl p-4 border border-charcoal/10">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-calm/20 flex items-center justify-center text-charcoal text-sm font-semibold">
                  {post.author_name?.charAt(0).toUpperCase() || "A"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-charcoal text-sm">{post.author_name}</span>
                    <span className="text-xs text-charcoal/60">{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-charcoal/80 text-sm leading-relaxed">{post.content}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {user ? (
        <div className="border-t border-charcoal/10 p-6">
          <form onSubmit={handleSubmitPost}>
            <div className="mb-4">
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Share your thoughts on this article..."
                className="w-full px-4 py-3 border border-charcoal/15 rounded-xl focus:ring-2 focus:ring-calm/30 focus:border-calm resize-none"
                rows={3}
                maxLength={1000}
                required
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-charcoal/60">{newPost.length}/1000 characters</span>
                <span className="text-xs text-charcoal/60">Posts are moderated by AI</span>
              </div>
            </div>
            <button type="submit" disabled={submitting || !newPost.trim()} className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed">
              {submitting ? "Posting..." : "Post comment"}
            </button>
          </form>
        </div>
      ) : (
        <div className="border-t border-charcoal/10 p-6 text-center">
          <p className="text-charcoal/70 mb-4">Join the conversation. Sign in to share your thoughts.</p>
          <Link href="/login" className="btn-primary inline-flex">
            Sign in to comment
          </Link>
        </div>
      )}
    </div>
  );
}
