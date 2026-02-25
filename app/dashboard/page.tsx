"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { Article } from "../../types/article";
import ArticleCard from "../../components/ArticleCard";
import EditorReviewCard from "../../components/EditorReviewCard";

export default function DashboardPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const [userArticles, setUserArticles] = useState<{
    drafts: Article[];
    review: Article[];
    published: Article[];
  }>({ drafts: [], review: [], published: [] });
  const [reviewQueue, setReviewQueue] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const { data: userData } = await supabase
        .from("articles")
        .select("*")
        .eq("author_id", user.id)
        .order("created_at", { ascending: false });

      if (userData) {
        const list = userData as Article[];
        const reviewList = list.filter(
          (a) => a.status === "review" || a.status === "pending_ai_review" || a.status === "needs_revision" || a.status === "approved"
        );
        setUserArticles({
          drafts: list.filter((a) => a.status === "draft"),
          review: reviewList,
          published: list.filter((a) => a.status === "published" || a.status === "approved"),
        });
        setReviewQueue(reviewList);
      } else {
        setReviewQueue([]);
      }
      setLoading(false);
    };

    fetchData();
  }, [user, authLoading, router]);

  const refreshData = () => {
    if (user) {
      supabase
        .from("articles")
        .select("*")
        .eq("author_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data: userData }) => {
          if (userData) {
            const list = userData as Article[];
            const reviewList = list.filter(
              (a) => a.status === "review" || a.status === "pending_ai_review" || a.status === "needs_revision" || a.status === "approved"
            );
            setUserArticles({
              drafts: list.filter((a) => a.status === "draft"),
              review: reviewList,
              published: list.filter((a) => a.status === "published" || a.status === "approved"),
            });
            setReviewQueue(reviewList);
          }
        });
    }
  };

  const stats = useMemo(
    () => [
      { label: "Drafts", value: userArticles.drafts.length },
      { label: "In review", value: userArticles.review.length },
      { label: "Published", value: userArticles.published.length },
    ],
    [userArticles]
  );

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-charcoal/20 border-t-accent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 right-10 h-72 w-72 rounded-full bg-calm/20 blur-3xl" />
          <div className="absolute top-40 -left-20 h-64 w-64 rounded-full bg-hope/15 blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <div className="max-w-3xl">
              <p className="text-meta uppercase tracking-[0.3em] text-charcoal/60">Dashboard</p>
              <h1 className="font-display text-display-2xl text-charcoal font-semibold tracking-tight mt-4">
                Your writing studio
              </h1>
              <p className="mt-3 text-body text-charcoal/70">
                Track your drafts, review status, and published work.
              </p>
            </div>
            <div className="rounded-2xl border border-charcoal/10 bg-white/80 p-4 shadow-soft lg:justify-self-end">
              <p className="text-meta text-charcoal/60 mb-3">Quick actions</p>
              <div className="flex flex-col gap-3">
                <Link href="/my-articles" className="btn-secondary text-center">
                  Open My Articles
                </Link>
                <button onClick={() => router.push("/submit")} className="btn-primary">
                  Submit new article
                </button>
              </div>
            </div>
          </header>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {stats.map((item) => (
              <div key={item.label} className="rounded-2xl border border-charcoal/10 bg-white/80 p-5 shadow-soft">
                <p className="text-meta text-charcoal/60">{item.label}</p>
                <p className="mt-2 text-3xl font-display text-charcoal">{item.value}</p>
              </div>
            ))}
          </div>

          <section className="mt-14 rounded-3xl border border-charcoal/10 bg-white/90 p-8 sm:p-10 shadow-soft">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="font-display text-display text-charcoal font-semibold">Review queue</h2>
                <p className="text-body text-charcoal/70 mt-2">
                  Articles awaiting editorial review.
                </p>
              </div>
              <button onClick={refreshData} className="btn-secondary">
                Refresh
              </button>
            </div>

            <div className="mt-8">
              {reviewQueue.length === 0 ? (
                <div className="py-12 text-center border border-charcoal/10 rounded-2xl bg-paper/60">
                  <p className="text-charcoal/70 text-body">No articles pending review.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {reviewQueue.map((article) => (
                    <EditorReviewCard key={article.id} article={article} onUpdate={refreshData} />
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="mt-16">
            <h2 className="font-display text-display text-charcoal font-semibold mb-8">Your articles</h2>

            <div className="mb-12">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xl text-charcoal">Drafts</h3>
                <span className="text-meta text-charcoal/60">{userArticles.drafts.length} total</span>
              </div>
              {userArticles.drafts.length === 0 ? (
                <div className="rounded-2xl border border-charcoal/10 bg-white/80 p-6 text-charcoal/70">
                  No drafts yet.
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {userArticles.drafts.map((article) => (
                    <ArticleCard key={article.id} article={article} showMeta={true} />
                  ))}
                </div>
              )}
            </div>

            <div className="mb-12">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xl text-charcoal">In review</h3>
                <span className="text-meta text-charcoal/60">{userArticles.review.length} total</span>
              </div>
              {userArticles.review.length === 0 ? (
                <div className="rounded-2xl border border-charcoal/10 bg-white/80 p-6 text-charcoal/70">
                  No articles in review.
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {userArticles.review.map((article) => (
                    <ArticleCard key={article.id} article={article} showMeta={true} />
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xl text-charcoal">Published</h3>
                <span className="text-meta text-charcoal/60">{userArticles.published.length} total</span>
              </div>
              {userArticles.published.length === 0 ? (
                <div className="rounded-2xl border border-charcoal/10 bg-white/80 p-6 text-charcoal/70">
                  No published articles yet.
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {userArticles.published.map((article) => (
                    <ArticleCard key={article.id} article={article} showMeta={true} />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
