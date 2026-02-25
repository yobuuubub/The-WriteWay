"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { Article } from "../../../types/article";
import ArticleMeta from "../../../components/ArticleMeta";
import ContextBox from "../../../components/ContextBox";
import ArticleDiscussion from "../../../components/ArticleDiscussion";
import SaveToCollection from "../../../components/SaveToCollection";
import sanitizeHtml from "sanitize-html";
import { getArticleTypeLabel } from "../../../lib/article-type-label";

const typeHeaderTint: Record<string, string> = {
  reporting: "bg-calm-soft/40",
  explainer: "bg-hope-soft/40",
  perspective: "bg-emotion-soft/40",
  letter: "bg-hope-gold-soft/50",
};

const typeAccentLine: Record<string, string> = {
  reporting: "bg-calm",
  explainer: "bg-hope",
  perspective: "bg-emotion",
  letter: "bg-secondary",
};

const typeLabelColor: Record<string, string> = {
  reporting: "text-calm",
  explainer: "text-hope",
  perspective: "text-emotion",
  letter: "text-secondary",
};

export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const [article, setArticle] = useState<Article | null>(null);
  const [media, setMedia] = useState<{ url: string; caption?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadArticle() {
      if (!slug) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("slug", slug)
        .in("status", ["approved", "published"])
        .single();
      if (error || !data) {
        setLoading(false);
        return;
      }
      setArticle(data as Article);
      const { data: mediaRows } = await supabase
        .from("article_media")
        .select("url, caption, sort_order")
        .eq("article_id", data.id)
        .order("sort_order", { ascending: true });
      setMedia((mediaRows as any) || []);
      setLoading(false);
    }
    loadArticle();
  }, [slug]);

  const articleContent = article?.content ?? "";
  const isHtml = /<[^>]+>/.test(articleContent);
  const sanitizedHtml = useMemo(() => {
    if (!articleContent) return "";
    return sanitizeHtml(articleContent, {
      allowedTags: [
        "p",
        "br",
        "strong",
        "em",
        "u",
        "a",
        "ul",
        "ol",
        "li",
        "blockquote",
        "h2",
        "h3",
        "h4",
        "hr",
        "figure",
        "figcaption",
        "img",
      ],
      allowedAttributes: {
        a: ["href", "target", "rel"],
        img: ["src", "alt"],
      },
      allowedSchemes: ["http", "https", "mailto"],
      allowProtocolRelative: false,
      transformTags: {
        a: (tagName, attribs) => {
          const href = attribs.href || "";
          const safeHref = /^https?:\/\//i.test(href) || /^mailto:/i.test(href) ? href : "#";
          return {
            tagName: "a",
            attribs: {
              href: safeHref,
              rel: "noopener noreferrer nofollow",
              target: "_blank",
            },
          };
        },
      },
    });
  }, [articleContent]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-charcoal/20 border-t-calm rounded-full animate-spin" />
      </main>
    );
  }

  if (!article) {
    return (
      <main className="min-h-screen flex items-center justify-center py-32">
        <div className="text-center max-w-md">
          <h1 className="font-display text-2xl text-charcoal mb-4">Article not found</h1>
          <button onClick={() => router.push("/")} className="btn-primary">
            Return home
          </button>
        </div>
      </main>
    );
  }

  const headerTint = typeHeaderTint[article.type] || typeHeaderTint.reporting;
  const accentLine = typeAccentLine[article.type] || typeAccentLine.reporting;
  const labelColor = typeLabelColor[article.type] || typeLabelColor.reporting;
  const articleBody = isHtml ? (
    <div
      className="text-body-lg text-charcoal/90 leading-relaxed prose max-w-none prose-img:rounded-xl prose-figcaption:text-sm prose-figcaption:text-charcoal/60"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  ) : (
    <div className="text-body-lg text-charcoal/90 leading-relaxed whitespace-pre-wrap">
      {article.content}
    </div>
  );

  return (
    <main className="min-h-screen bg-paper">
      {/* Tinted intro section */}
      <div className={`${headerTint} py-12 sm:py-16`}>
        <div className="max-w-prose mx-auto px-5 sm:px-8">
          <Link
            href="/feed"
            className="inline-flex items-center gap-2 text-meta text-charcoal-muted hover:text-charcoal mb-10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to feed
          </Link>

          <header>
            <p className={`text-meta mb-4 capitalize ${labelColor} font-semibold`}>{getArticleTypeLabel(article.type)}</p>
            <h1 className="font-display text-display-xl sm:text-display-2xl font-bold text-charcoal leading-tight tracking-tight">
              {article.title}
            </h1>
            <div className={`mt-4 w-16 h-1 rounded-full ${accentLine}`} />
            <ArticleMeta article={article} showAuthor={true} />
          </header>
        </div>
      </div>

      {/* Article body - neutral rest */}
      <article className="py-12 sm:py-16">
        <div className="max-w-prose mx-auto px-5 sm:px-8">
          {article.context_box && (
            <div className="mb-12">
              <ContextBox content={article.context_box} articleType={article.type} />
            </div>
          )}

          {article.disclosure && (
            <div className="context-box mb-12">
              <p className="text-meta text-charcoal-muted mb-2 flex items-center gap-2">
                <span className="text-secondary/70" aria-hidden>*</span>
                Disclosure
              </p>
              <p className="text-body text-charcoal/85">{article.disclosure}</p>
            </div>
          )}

          {media.length > 0 && (
            <div className="mb-10 grid gap-4 sm:grid-cols-2">
              {media.map((item, index) => (
                <figure key={`${item.url}-${index}`} className="bg-paper/60 rounded-2xl p-3 border border-charcoal/10">
                  <img src={item.url} alt={item.caption || "Article media"} className="w-full h-auto rounded-xl" />
                  {item.caption && (
                    <figcaption className="text-sm text-charcoal/60 mt-2">{item.caption}</figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}

          {articleBody}

          {/* Emotional divider - breathing moment */}
          <div className="mt-20 flex items-center justify-center gap-3 py-8" aria-hidden>
            <span className="w-2 h-2 rounded-full bg-hope/40" />
            <span className="w-3 h-3 rounded-full bg-emotion/30" />
            <span className="w-2 h-2 rounded-full bg-calm/40" />
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <SaveToCollection articleId={article.id} articleTitle={article.title} />
            <div className="rounded-2xl border border-charcoal/10 bg-white/90 p-5 shadow-soft">
              <p className="text-meta text-charcoal/60 mb-2">Join the discussion</p>
              <p className="text-sm text-charcoal/70">
                Share a short response or reply to someone else.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="#discussion" className="btn-primary text-sm inline-flex">
                  View responses
                </Link>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="btn-secondary text-sm inline-flex"
                >
                  Read again
                </button>
              </div>
            </div>
          </div>

          <div className="mt-12">
            <ArticleDiscussion articleId={article.id} articleTitle={article.title} />
          </div>
        </div>
      </article>
    </main>
  );
}
