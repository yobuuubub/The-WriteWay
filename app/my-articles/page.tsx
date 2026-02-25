"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { useUser } from "../../lib/auth";
import { Article } from "../../types/article";
import RoleGate from "../../components/RoleGate";
import { stripHtmlToText } from "../../lib/content-text";

const STATUS_CLASSES: Record<string, string> = {
  pending_ai_review: "bg-status-pending/10 text-status-pending border-status-pending/30",
  needs_revision: "bg-status-revision/10 text-status-revision border-status-revision/30",
  approved: "bg-status-approved/10 text-status-approved border-status-approved/30",
  rejected: "bg-status-rejected/10 text-status-rejected border-status-rejected/30",
};

const STATUS_LABELS: Record<string, string> = {
  pending_ai_review: "Under Review",
  needs_revision: "Needs Revision",
  approved: "Published",
  rejected: "Not accepted",
};

export default function MyArticlesPage() {
  const { user } = useUser();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadArticles() {
      if (!user) return;

      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("author_id", user.id)
        .order("created_at", { ascending: false });

      setLoading(false);

      if (error) {
        setError("Failed to load your articles. Please try again.");
        console.error("Error loading articles:", error);
      } else {
        setArticles(data || []);
      }
    }

    loadArticles();
  }, [user]);

  const drafts = articles.filter((article) => article.status === "draft");
  const reviewed = articles.filter((article) =>
    ["pending_ai_review", "needs_revision", "approved", "rejected"].includes(article.status)
  );

  function getWordCount(content: string): number {
    const text = stripHtmlToText(content || "");
    if (!text) return 0;
    return text.split(" ").filter(Boolean).length;
  }

  return (
    <RoleGate>
      <main className="min-h-screen bg-paper py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <header className="mb-12">
            <p className="text-meta uppercase tracking-[0.3em] text-charcoal/60">My Articles</p>
            <h1 className="font-display text-display-2xl text-charcoal mt-4">Track your submissions</h1>
            <p className="text-charcoal/70 mt-3 max-w-2xl">
              Follow your article status, apply revision feedback, and open published pieces.
            </p>
          </header>

          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-charcoal/20 border-t-calm"></div>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-urgency/20 bg-urgency-soft p-6">
              <h3 className="font-semibold text-urgency mb-2">Error loading articles</h3>
              <p className="text-urgency">{error}</p>
            </div>
          ) : articles.length === 0 ? (
            <div className="rounded-3xl border border-charcoal/10 bg-white/80 p-10 text-center shadow-soft">
              <h3 className="font-display text-2xl text-charcoal">No articles yet</h3>
              <p className="text-charcoal/70 mt-3 mb-6">Start your first submission to begin your writing record.</p>
              <Link href="/submit" className="btn-primary inline-flex">
                Submit your first article
              </Link>
            </div>
          ) : (
            <div className="space-y-12">
              <section>
                <div className="flex items-end justify-between gap-4 mb-5">
                  <h2 className="font-display text-display text-charcoal">My Drafts</h2>
                  <p className="text-sm text-charcoal/60">{drafts.length} total</p>
                </div>
                {drafts.length === 0 ? (
                  <div className="rounded-2xl border border-charcoal/10 bg-paper-warm p-6 text-charcoal/70">
                    No drafts right now.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {drafts.map((article) => (
                      <article key={article.id} className="rounded-2xl border border-charcoal/10 bg-white/90 p-5 shadow-soft">
                        <p className="text-meta capitalize text-charcoal/60">{article.type}</p>
                        <h3 className="mt-2 font-display text-2xl text-charcoal line-clamp-2">{article.title}</h3>
                        <p className="mt-2 text-sm text-charcoal/65">
                          {getWordCount(article.content)} words
                          {article.created_at ? ` - ${new Date(article.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}` : ""}
                        </p>
                        <div className="mt-5">
                          <Link href={`/submit?edit=${article.id}`} className="btn-secondary">
                            Edit
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <div className="flex items-end justify-between gap-4 mb-5">
                  <h2 className="font-display text-display text-charcoal">Under Review / Reviewed</h2>
                  <p className="text-sm text-charcoal/60">{reviewed.length} total</p>
                </div>
                {reviewed.length === 0 ? (
                  <div className="rounded-2xl border border-charcoal/10 bg-paper-warm p-6 text-charcoal/70">
                    No reviewed articles yet.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {reviewed.map((article) => (
                      <article key={article.id} className="rounded-2xl border border-charcoal/10 bg-white/90 p-5 shadow-soft">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <p className="text-meta capitalize text-charcoal/60">{article.type}</p>
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
                              STATUS_CLASSES[article.status] || "bg-charcoal/5 text-charcoal/70 border-charcoal/20"
                            }`}
                          >
                            {STATUS_LABELS[article.status] || article.status}
                          </span>
                        </div>
                        <h3 className="font-display text-2xl text-charcoal line-clamp-2">{article.title}</h3>
                        {article.ai_feedback ? (
                          <p className="mt-3 text-sm italic text-charcoal/70">"{article.ai_feedback}"</p>
                        ) : (
                          <p className="mt-3 text-sm italic text-charcoal/50">No feedback yet.</p>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </RoleGate>
  );
}


