"use client";

import React, { useState } from "react";
import { Discussion } from "../types/discussion";

interface DiscussionPromptProps {
  discussion: Discussion;
  onSubmitPost?: (content: string, replyTo?: { id: string; name: string } | null) => Promise<void>;
  canPost?: boolean;
  dailyPostCount?: number;
  maxPostsPerDay?: number;
  replyTo?: { id: string; name: string } | null;
  onCancelReply?: () => void;
}

export default function DiscussionPrompt({
  discussion,
  onSubmitPost,
  canPost = true,
  dailyPostCount = 0,
  maxPostsPerDay = 2,
  replyTo = null,
  onCancelReply,
}: DiscussionPromptProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MIN_CHARS = 30;
  const MAX_WORDS = 300;
  const remainingPosts = Math.max(0, maxPostsPerDay - dailyPostCount);
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const meetsMin = content.trim().length >= MIN_CHARS;
  const withinMaxWords = words > 0 && words <= MAX_WORDS;
  const canSubmit = canPost && meetsMin && withinMaxWords && dailyPostCount < maxPostsPerDay && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !onSubmitPost) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmitPost(content.trim(), replyTo);
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 sm:p-10 bg-white border border-charcoal/6 rounded-2xl shadow-soft overflow-hidden">
      <div className="motif-dots mb-6">
        <span className="bg-hope-gold/50" />
        <span className="bg-emotion/40" />
        <span className="bg-calm/40" />
      </div>
      <h2 className="font-display text-2xl text-charcoal font-bold mb-2">Discussion</h2>
      <div className="w-12 h-0.5 bg-hope-gold rounded-full mb-8" />
      {/* Guiding question - warmer, reflection tone */}
      <div className="context-box mb-8 bg-hope-gold-soft/40 border-l-hope-gold">
        <p className="text-body-lg text-charcoal/90 italic leading-relaxed">
          {discussion.guiding_question}
        </p>
      </div>

      {canPost ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="post-content" className="block text-meta text-charcoal-muted mb-2">
              Your response
            </label>
            {replyTo && (
              <div className="mb-3 flex items-center justify-between rounded-xl border border-hope-gold/30 bg-hope-gold-soft/40 px-4 py-2 text-sm text-charcoal/80">
                <span>
                  Replying to <strong>{replyTo.name}</strong>
                </span>
                {onCancelReply && (
                  <button
                    type="button"
                    onClick={onCancelReply}
                    className="text-xs uppercase tracking-[0.2em] text-charcoal/60 hover:text-charcoal"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
            <textarea
              id="post-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts (max 300 words)..."
              className="w-full min-h-[120px] px-4 py-3 bg-paper border border-charcoal/12 rounded-xl text-charcoal placeholder-charcoal/40 focus:outline-none focus:ring-2 focus:ring-calm/30 focus:border-calm resize-none transition-all"
              maxLength={5000}
              disabled={loading}
            />
            <p className="mt-2 text-meta text-charcoal-muted">
              {words} / {MAX_WORDS} words - {remainingPosts} post{remainingPosts !== 1 ? "s" : ""} left today
            </p>
          </div>

          {error && (
            <div className="p-4 bg-urgency-soft border border-urgency/20 rounded-xl" role="alert">
              <p className="text-urgency text-body">{error}</p>
            </div>
          )}
          {dailyPostCount >= maxPostsPerDay && (
            <div className="p-4 bg-hope-gold-soft border border-hope-gold/30 rounded-xl" role="status">
              <p className="text-charcoal/80 text-body">Daily post limit reached.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-6 py-3"
          >
            {loading ? "Submitting..." : "Submit response"}
          </button>
        </form>
      ) : (
        <div className="p-6 bg-hope-gold-soft/50 border border-hope-gold/20 rounded-xl">
          <p className="text-body text-charcoal-muted">Sign in to participate in discussions.</p>
        </div>
      )}
    </div>
  );
}
