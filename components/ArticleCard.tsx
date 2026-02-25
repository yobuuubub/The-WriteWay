"use client";

import React from "react";
import Link from "next/link";
import { Article } from "../types/article";
import ArticleMeta from "./ArticleMeta";
import { getArticleTypeLabel } from "../lib/article-type-label";
import { stripHtmlToText } from "../lib/content-text";

const typeBadgeColor: Record<string, string> = {
  reporting: "text-calm",
  explainer: "text-hope",
  perspective: "text-emotion",
  letter: "text-secondary",
};

interface ArticleCardProps {
  article: Article;
  showMeta?: boolean;
  accentColor?: { bg: string; accent: string; label: string };
}

export default function ArticleCard({ article, showMeta = true }: ArticleCardProps) {
  const badgeColor = typeBadgeColor[article.type] || typeBadgeColor.reporting;
  const typeClass = `card-type-${article.type}`;
  const excerpt = stripHtmlToText(article.content);

  return (
    <Link href={`/articles/${article.slug}`}>
      <article
        className={`group block card-editorial h-full p-6 sm:p-8 border-l-4 border-l-transparent ${typeClass}`}
      >
        <p className={`text-meta mb-3 capitalize ${badgeColor}`}>{getArticleTypeLabel(article.type)}</p>
        <h3 className="font-display text-xl sm:text-2xl text-charcoal leading-tight line-clamp-2 motion-base">
          {article.title}
        </h3>
        {showMeta && (
          <div className="mt-4">
            <ArticleMeta article={article} authorLink={false} />
          </div>
        )}
        <p className="text-charcoal/75 text-body mt-4 line-clamp-3 leading-relaxed">
          {excerpt}
        </p>
        <p className="mt-5 text-meta text-calm card-link inline-flex items-center gap-1 motion-fast">
          Read article
          <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </p>
      </article>
    </Link>
  );
}
