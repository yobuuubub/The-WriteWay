"use client";

import React, { useEffect, useState } from "react";
import { DiscussionPost as DiscussionPostType } from "../types/discussion";
import { supabase } from "../lib/supabase";
import ModerationBadge from "./ModerationBadge";

interface DiscussionPostProps {
  post: DiscussionPostType;
  showAuthor?: boolean;
  index?: number;
  onReply?: (payload: { id: string; name: string }) => void;
}

const REPLY_PREFIX = /^\[\[reply_to:([^|]+)\|([^\]]+)\]\]\s*/;

function parseReply(content: string) {
  const match = content.match(REPLY_PREFIX);
  if (!match) return { replyToName: null as string | null, clean: content };
  return {
    replyToName: match[2],
    clean: content.replace(REPLY_PREFIX, "").trimStart(),
  };
}

/* Alternate warm/cool for visual rhythm - questions lighter, reflections warmer */
export default function DiscussionPost({ post, showAuthor = true, index = 0, onReply }: DiscussionPostProps) {
  const [authorName, setAuthorName] = useState<string | null>(null);
  const isWarm = index % 2 === 0;
  const parsed = parseReply(post.content || "");

  useEffect(() => {
    if (showAuthor && post.author_id) {
      supabase
        .from("users")
        .select("display_name")
        .eq("id", post.author_id)
        .single()
        .then(({ data }) => {
          if (data) setAuthorName(data.display_name);
        });
    }
  }, [post.author_id, showAuthor]);

  return (
    <article
      className={`relative p-6 rounded-2xl border transition-all duration-500 ${
        isWarm
          ? "bg-hope-gold-soft/20 border-hope-gold/15 hover:bg-hope-gold-soft/35 hover:border-hope-gold/25 border-l-4 border-l-hope-gold/40"
          : "bg-calm-soft/20 border-calm/10 hover:bg-calm-soft/35 hover:border-calm/20 border-l-4 border-l-calm/30"
      }`}
    >
      {post.flagged && (
        <div className="mb-3">
          <ModerationBadge />
        </div>
      )}
      {showAuthor && authorName && (
        <p className="text-meta text-charcoal-muted mb-2">
          {authorName} - {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
      {parsed.replyToName && (
        <p className="text-xs uppercase tracking-[0.22em] text-charcoal/45 mb-2">
          Replying to {parsed.replyToName}
        </p>
      )}
      <p className="text-body text-charcoal/90 leading-relaxed whitespace-pre-wrap">
        {parsed.clean}
      </p>
      {onReply && (
        <button
          type="button"
          onClick={() => onReply({ id: post.id, name: authorName || "Reader" })}
          className="mt-3 text-xs uppercase tracking-[0.2em] text-charcoal/60 hover:text-charcoal"
        >
          Reply
        </button>
      )}
    </article>
  );
}
