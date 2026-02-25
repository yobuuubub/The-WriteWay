"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Article } from "../types/article";
import { safeGetAccessToken } from "../lib/auth-session";
import ArticleMeta from "./ArticleMeta";
import ContextBox from "./ContextBox";
import { getArticleTypeLabel } from "../lib/article-type-label";
import { stripHtmlToText } from "../lib/content-text";

interface EditorReviewCardProps {
  article: Article;
  onUpdate: () => void;
}

export default function EditorReviewCard({ article, onUpdate }: EditorReviewCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contentPreview = stripHtmlToText(article.content);

  async function submitModerationAction(action: "publish" | "return_to_draft") {
    setLoading(true);
    setError(null);
    try {
      const token = await safeGetAccessToken();
      if (!token) {
        setError("Please sign in again.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/articles/moderate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ articleId: article.id, action }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 403 && action === "publish") {
          setError("This article cannot be published yet. Wait for approval or revise and resubmit.");
        } else {
          setError(payload?.error || "Request failed.");
        }
        setLoading(false);
        return;
      }

      setLoading(false);
      onUpdate();
    } catch (requestError: any) {
      setLoading(false);
      setError(requestError?.message || "Request failed.");
    }
  }

  async function handlePublish() {
    await submitModerationAction("publish");
  }

  async function handleReject() {
    if (!confirm("Reject this article? This cannot be undone.")) return;
    await submitModerationAction("return_to_draft");
  }

  const canPublish = article.status === "approved";
  const waitingReview = article.status === "pending_ai_review" || article.status === "review";
  const needsRevision = article.status === "needs_revision";

  return (
    <div className="p-6 sm:p-8 bg-white border border-charcoal/8 rounded-sm shadow-soft">
      <div className="mb-4">
        <span className="text-meta text-charcoal-muted capitalize">{getArticleTypeLabel(article.type)}</span>
        <h3 className="font-display text-xl text-charcoal font-semibold mt-2 mb-3">{article.title}</h3>
        <ArticleMeta article={article} showAuthor={true} />
      </div>

      {article.context_box && (
        <div className="mb-4">
          <ContextBox content={article.context_box} />
        </div>
      )}

      {article.disclosure && (
        <div className="mb-4 context-box">
          <p className="text-meta text-charcoal-muted mb-1">Disclosure</p>
          <p className="text-body text-charcoal/85">{article.disclosure}</p>
        </div>
      )}

      <div className="mb-6">
        <p className="text-body text-charcoal/85 leading-relaxed whitespace-pre-wrap">
          {contentPreview}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-sm">
          <p className="text-red-800 text-body">{error}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {canPublish ? (
          <button
            onClick={handlePublish}
            disabled={loading}
            className="btn-primary disabled:opacity-50"
          >
            {loading ? "Publishing..." : "Publish"}
          </button>
        ) : null}
        {needsRevision ? (
          <Link href={`/submit?edit=${article.id}`} className="btn-primary">
            Edit and resubmit
          </Link>
        ) : null}
        {waitingReview ? (
          <span className="inline-flex items-center px-3 py-2 text-sm text-charcoal/60 bg-paper-warm rounded-sm border border-charcoal/10">
            Awaiting AI review
          </span>
        ) : null}
        <button
          onClick={handleReject}
          disabled={loading}
          className="btn-secondary disabled:opacity-50"
        >
          Return to draft
        </button>
      </div>
    </div>
  );
}
