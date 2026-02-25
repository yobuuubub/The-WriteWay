"use client";
// components/ArticleMeta.tsx
// Displays byline, date, author info, and tags for articles.

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Article } from '../types/article';
import { supabase } from '../lib/supabase';

interface ArticleMetaProps {
  article: Article;
  showAuthor?: boolean;
  authorLink?: boolean;
}

export default function ArticleMeta({ article, showAuthor = true, authorLink = true }: ArticleMetaProps) {
  const [author, setAuthor] = useState<{ display_name?: string; country?: string; age_range?: string; handle?: string } | null>(null);

  useEffect(() => {
    if (showAuthor && article.author_id) {
      supabase
        .from('users')
        .select('display_name, country, age_range, handle')
        .eq('id', article.author_id)
        .single()
        .then(({ data }) => {
          if (data) setAuthor(data);
        });
    }
  }, [article.author_id, showAuthor]);

  const authorLabel = author?.display_name ? author.display_name : null;

  const dateStr = (article.published_at || (article as any).created_at);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-charcoal-muted">
      {dateStr && (
        <time dateTime={dateStr}>
          {new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </time>
      )}
      {showAuthor && authorLabel && (
        <>
          <span aria-hidden>|</span>
          {author?.handle && authorLink ? (
            <Link
              href={`/profiles/${author.handle}`}
              className="text-charcoal/80 hover:text-charcoal hover:underline underline-offset-4 transition-colors"
            >
              {authorLabel}{author?.country ? ` | ${author.country}` : ""}
            </Link>
          ) : (
            <span className="text-charcoal/80">{authorLabel}{author?.country ? ` | ${author.country}` : ""}</span>
          )}
        </>
      )}
    </div>
  );
}
