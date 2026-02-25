"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { safeGetAccessToken } from "../lib/auth-session";
import { useUser } from "../lib/auth";
import { Discussion, DiscussionPost } from "../types/discussion";

type PostWithAuthor = DiscussionPost & {
  author_name?: string;
  reply_to_id?: string | null;
  reply_to_name?: string | null;
};

type ArticleDiscussionProps = {
  articleId: string;
  articleTitle: string;
};

const MAX_WORDS = 300;
const MIN_CHARS = 30;
const MAX_POSTS_PER_DAY = 2;
const REPLY_PREFIX = /^\[\[reply_to:([^|]+)\|([^\]]+)\]\]\s*/;

function formatRelativeTime(dateStr: string) {
  const now = Date.now();
  const ts = new Date(dateStr).getTime();
  if (Number.isNaN(ts)) return "just now";
  const diff = Math.max(0, now - ts);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function initials(name?: string | null) {
  if (!name) return "Y";
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

function parseReply(content: string) {
  const match = content.match(REPLY_PREFIX);
  if (!match) return { replyToId: null, replyToName: null, clean: content };
  return {
    replyToId: match[1],
    replyToName: match[2],
    clean: content.replace(REPLY_PREFIX, "").trimStart(),
  };
}

export default function ArticleDiscussion({ articleId, articleTitle }: ArticleDiscussionProps) {
  const { user } = useUser();
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [dailyPostCount, setDailyPostCount] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);

  const remainingPosts = Math.max(0, MAX_POSTS_PER_DAY - dailyPostCount);
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const canSubmit =
    !!user &&
    content.trim().length >= MIN_CHARS &&
    words > 0 &&
    words <= MAX_WORDS &&
    dailyPostCount < MAX_POSTS_PER_DAY &&
    !submitting;

  const postCountLabel = useMemo(() => {
    if (posts.length === 1) return "1 response";
    return `${posts.length} responses`;
  }, [posts.length]);

  const previewLimit = 3;
  const previewPosts = posts.slice(0, previewLimit);
  const hasMore = posts.length > previewLimit;

  const loadPosts = useCallback(async (discussionId: string) => {
    const { data: postsData } = await supabase
      .from("posts")
      .select("id, content, author_id, created_at, flagged, users(display_name)")
      .eq("discussion_id", discussionId)
      .eq("flagged", false)
      .order("created_at", { ascending: true });

    const formatted = (postsData || []).map((post: any) => {
      const parsed = parseReply(post.content || "");
      return {
        id: post.id,
        content: parsed.clean,
        author_id: post.author_id,
        created_at: post.created_at,
        flagged: post.flagged,
        author_name: post.users?.display_name || "The WriteWay reader",
        reply_to_id: parsed.replyToId,
        reply_to_name: parsed.replyToName,
      };
    });
    setPosts(formatted as PostWithAuthor[]);
  }, []);

  const loadDailyCount = useCallback(async () => {
    if (!user?.id) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("author_id", user.id)
      .gte("created_at", today.toISOString());
    setDailyPostCount(count || 0);
  }, [user?.id]);

  useEffect(() => {
    if (!articleId) return;
    setLoading(true);

    async function loadDiscussion() {
      try {
        const ensureRes = await fetch("/api/discussions/ensure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleId, title: articleTitle }),
        });

        if (!ensureRes.ok) {
          const txt = await ensureRes.text().catch(() => "");
          throw new Error(txt || "Failed to initialize discussion");
        }

        const ensureData = await ensureRes.json();
        const discussionData = ensureData.discussion as Discussion | undefined;

        if (discussionData) {
          setDiscussion(discussionData);
          await loadPosts(discussionData.id);
          await loadDailyCount();
        }
      } catch (err) {
        console.error(err);
        setError("Discussion unavailable right now.");
      } finally {
        setLoading(false);
      }
    }

    loadDiscussion();
  }, [articleId, articleTitle, loadDailyCount, loadPosts, user?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!discussion || !user || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const token = await safeGetAccessToken();
      if (!token) {
        throw new Error("Please sign in again.");
      }

      const prefix = replyTo ? `[[reply_to:${replyTo.id}|${replyTo.name}]] ` : "";
      const payload = `${prefix}${content.trim()}`;
      const res = await fetch("/api/posts/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          discussionId: discussion.id,
          content: payload,
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Failed to post");
      }

      const data = await res.json();
      if (data.flagged) {
        setNotice("Thanks. Your response is under review for a moment.");
        setContent("");
        await loadDailyCount();
        return;
      }

      setContent("");
      setReplyTo(null);
      await loadPosts(discussion.id);
      await loadDailyCount();
    } catch (err: any) {
      setError(err?.message || "Failed to post.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="discussion" className="mt-16">
      <div className="rounded-3xl border border-charcoal/10 bg-white/90 p-8 sm:p-10 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-meta text-charcoal/60">Discussion</p>
            <h2 className="font-display text-xl text-charcoal font-semibold mt-2">
              Responses from the community
            </h2>
            <p className="text-sm text-charcoal/60 mt-1">{postCountLabel}</p>
          </div>
          <Link
            href={`/discussions/${articleId}`}
            className="text-sm text-calm hover:text-calm-deep hover:underline underline-offset-4"
          >
            Open full discussion
          </Link>
        </div>

        {discussion?.guiding_question && (
          <div className="mt-6 context-box bg-hope-gold-soft/40 border-l-hope-gold">
            <p className="text-body-lg text-charcoal/90 italic leading-relaxed">
              {discussion.guiding_question}
            </p>
          </div>
        )}

        <div className="mt-6 space-y-5">
          {loading ? (
            <div className="py-8 text-charcoal/60 text-body">Loading discussion...</div>
          ) : previewPosts.length === 0 ? (
            <div className="py-8 text-charcoal/60 text-body">No responses yet. Be the first.</div>
          ) : (
            previewPosts.map((post) => (
              <div
                key={post.id}
                className={`flex gap-4 rounded-2xl border border-charcoal/8 bg-paper/80 p-4 ${
                  post.reply_to_id ? "ml-6 border-l-2 border-hope-gold/30 pl-4" : ""
                }`}
              >
                <div className="h-10 w-10 rounded-full bg-hope/20 text-charcoal flex items-center justify-center text-sm font-semibold">
                  {initials(post.author_name)}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-charcoal/70">
                    <span className="font-semibold text-charcoal/90">{post.author_name}</span>
                    <span className="text-charcoal/40">-</span>
                    <span className="text-meta text-charcoal/60">{formatRelativeTime(post.created_at)}</span>
                  </div>
                  {post.reply_to_name && (
                    <p className="mt-1 text-xs uppercase tracking-[0.22em] text-charcoal/45">
                      Replying to {post.reply_to_name}
                    </p>
                  )}
                  <p className="mt-2 text-body text-charcoal/85 leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyTo({ id: post.id, name: post.author_name || "Reader" });
                      setShowComposer(true);
                      setNotice(null);
                      setError(null);
                      const el = document.getElementById("discussion-content");
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                    className="mt-3 text-xs uppercase tracking-[0.2em] text-charcoal/60 hover:text-charcoal"
                  >
                    Reply
                  </button>
                </div>
              </div>
            ))
          )}
          {!loading && hasMore && (
            <Link
              href={`/discussions/${articleId}`}
              className="text-sm text-calm hover:underline underline-offset-4"
            >
              View all responses
            </Link>
          )}
        </div>

        <div className="mt-8">
          {user ? (
            showComposer ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center justify-between text-meta text-charcoal/60">
                  <span>Add a response</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowComposer(false);
                      setReplyTo(null);
                    }}
                    className="text-xs uppercase tracking-[0.2em] text-charcoal/60 hover:text-charcoal"
                  >
                    Close
                  </button>
                </div>
                <div>
                  {replyTo && (
                    <div className="mb-3 flex items-center justify-between rounded-xl border border-hope-gold/30 bg-hope-gold-soft/40 px-4 py-2 text-sm text-charcoal/80">
                      <span>
                        Replying to <strong>{replyTo.name}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setReplyTo(null)}
                        className="text-xs uppercase tracking-[0.2em] text-charcoal/60 hover:text-charcoal"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  <textarea
                    id="discussion-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Share a thoughtful response..."
                    className="w-full min-h-[120px] px-4 py-3 bg-paper border border-charcoal/12 rounded-xl text-charcoal placeholder-charcoal/40 focus:outline-none focus:ring-2 focus:ring-calm/30 focus:border-calm resize-none transition-all"
                    maxLength={5000}
                    disabled={submitting}
                  />
                  <p className="mt-2 text-meta text-charcoal-muted">
                    {words}/{MAX_WORDS} words - {remainingPosts} post{remainingPosts !== 1 ? "s" : ""} left today
                  </p>
                </div>

                {error && (
                  <div className="p-4 bg-urgency-soft border border-urgency/20 rounded-xl" role="alert">
                    <p className="text-urgency text-body">{error}</p>
                  </div>
                )}
                {notice && (
                  <div className="p-4 bg-hope-gold-soft border border-hope-gold/30 rounded-xl" role="status">
                    <p className="text-charcoal/80 text-body">{notice}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-6 py-3"
                >
                  {submitting ? "Posting..." : "Post response"}
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowComposer(true)}
                className="btn-secondary text-sm"
              >
                Add a response
              </button>
            )
          ) : (
            <div className="p-6 bg-hope-gold-soft/50 border border-hope-gold/20 rounded-xl">
              <p className="text-body text-charcoal-muted">
                Sign in to participate in the discussion.
              </p>
              <Link href="/login" className="btn-primary mt-4 inline-flex">
                Sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
