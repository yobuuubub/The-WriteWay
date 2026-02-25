"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { safeGetAccessToken } from "../../../lib/auth-session";
import { useUser } from "../../../lib/auth";
import { Discussion, DiscussionPost } from "../../../types/discussion";
import DiscussionPrompt from "../../../components/DiscussionPrompt";
import DiscussionPostComponent from "../../../components/DiscussionPost";

export default function DiscussionPage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params?.articleId as string;
  const { user } = useUser();
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyPostCount, setDailyPostCount] = useState(0);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!articleId) return;
    setLoading(true);

    async function load() {
      try {
        const { data: articleData } = await supabase
          .from("articles")
          .select("title")
          .eq("id", articleId)
          .single();

        const ensureRes = await fetch("/api/discussions/ensure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleId, title: articleData?.title }),
        });

        if (!ensureRes.ok) {
          const txt = await ensureRes.text().catch(() => "");
          throw new Error(txt || "Failed to initialize discussion");
        }

        const ensureData = await ensureRes.json();
        const discussionData = ensureData.discussion as Discussion | undefined;

        if (discussionData) {
          setDiscussion(discussionData);
          const { data: postsData } = await supabase
            .from("posts")
            .select("*")
            .eq("discussion_id", discussionData.id)
            .order("created_at", { ascending: true });
          setPosts((postsData as DiscussionPost[]) || []);

          if (user?.id) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const { count } = await supabase
              .from("posts")
              .select("*", { count: "exact", head: true })
              .eq("author_id", user.id)
              .gte("created_at", today.toISOString());
            setDailyPostCount(count || 0);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [articleId, user]);

  async function handleSubmitPost(content: string, reply?: { id: string; name: string } | null) {
    if (!user || !discussion) return;
    const token = await safeGetAccessToken();
    if (!token) {
      throw new Error("Please sign in again.");
    }

    const prefix = reply ? `[[reply_to:${reply.id}|${reply.name}]] ` : "";
    const res = await fetch("/api/posts/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        discussionId: discussion.id,
        content: `${prefix}${content}`,
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || "Failed to create post");
    }
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .eq("discussion_id", discussion.id)
      .order("created_at", { ascending: true });
    setPosts((postsData as DiscussionPost[]) || []);
    setDailyPostCount((c) => c + 1);
    setReplyTo(null);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-charcoal/20 border-t-accent rounded-full animate-spin" />
      </main>
    );
  }

  if (!discussion) {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center py-32">
        <div className="text-center">
          <h1 className="font-display text-2xl text-charcoal mb-4">Discussion not found</h1>
          <button onClick={() => router.push("/")} className="btn-primary">
            Return home
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 right-10 h-72 w-72 rounded-full bg-hope/20 blur-3xl" />
          <div className="absolute top-40 -left-20 h-64 w-64 rounded-full bg-calm/15 blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <button
            onClick={() => router.back()}
            className="mb-10 inline-flex items-center gap-2 text-meta text-charcoal-muted hover:text-charcoal transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <header className="mb-12">
            <p className="text-meta uppercase tracking-[0.3em] text-charcoal/60">Discussion</p>
            <h1 className="font-display text-display-2xl text-charcoal font-semibold tracking-tight mt-4">
              A room for reflection
            </h1>
            <p className="mt-3 text-body text-charcoal/70 max-w-2xl">
              This space is designed for depth and respect. Respond slowly and leave the story better than you found it.
            </p>
          </header>

          <div className="lg:grid lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-7 space-y-10">
              <DiscussionPrompt
                discussion={discussion}
                onSubmitPost={handleSubmitPost}
                canPost={!!user}
                dailyPostCount={dailyPostCount}
                maxPostsPerDay={2}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
              />

              <div>
                <h2 className="font-display text-display text-charcoal font-semibold mb-6">
                  Responses ({posts.length})
                </h2>
                {posts.length === 0 ? (
                  <div className="py-12 text-center border border-charcoal/10 rounded-2xl bg-white/80">
                    <p className="text-charcoal/70 text-body">No responses yet. Be the first to share your thoughts.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {posts.map((post, i) => (
                      <DiscussionPostComponent
                        key={post.id}
                        post={post}
                        showAuthor={true}
                        index={i}
                        onReply={(payload) => setReplyTo(payload)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <aside className="lg:col-span-5 mt-12 lg:mt-0 space-y-6">
              <div className="rounded-3xl border border-charcoal/10 bg-paper-warm p-8 shadow-soft">
                <h3 className="font-display text-xl text-charcoal font-semibold mb-3">Guidelines</h3>
                <ul className="text-body text-charcoal/75 space-y-3">
                  <li className="flex gap-3">
                    <span className="h-2 w-2 mt-2 rounded-full bg-hope" />
                    Maximum 2 posts per day.
                  </li>
                  <li className="flex gap-3">
                    <span className="h-2 w-2 mt-2 rounded-full bg-calm" />
                    Posts must be 300 words or less.
                  </li>
                  <li className="flex gap-3">
                    <span className="h-2 w-2 mt-2 rounded-full bg-emotion" />
                    Be respectful and thoughtful.
                  </li>
                </ul>
              </div>

              <div className="rounded-3xl border border-charcoal/10 bg-white/90 p-8 shadow-soft">
                <h3 className="font-display text-xl text-charcoal font-semibold">Daily rhythm</h3>
                <p className="mt-3 text-body text-charcoal/80">
                  You have {Math.max(0, 2 - dailyPostCount)} post
                  {Math.max(0, 2 - dailyPostCount) !== 1 ? "s" : ""} left today.
                </p>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-charcoal/10">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.min(100, (dailyPostCount / 2) * 100)}%` }}
                  />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
