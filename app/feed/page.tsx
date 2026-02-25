"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { Article } from "../../types/article";
import ArticleMeta from "../../components/ArticleMeta";
import "./feed.css";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const toDataUri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;

const leadImage = toDataUri(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1400 900'>
    <rect width='1400' height='900' fill='#ece9e3'/>
    <rect y='520' width='1400' height='380' fill='#d8d3cc'/>
    <rect y='360' width='1400' height='160' fill='#e2ded7'/>
    <rect x='120' y='210' width='420' height='220' fill='#d7d2cb'/>
    <rect x='590' y='170' width='520' height='260' fill='#e0dbd4'/>
    <rect x='1140' y='240' width='200' height='150' fill='#d0cbc4'/>
    <g opacity='0.35'>
      <rect x='160' y='600' width='520' height='22' fill='#c9c4be'/>
      <rect x='760' y='600' width='300' height='22' fill='#c9c4be'/>
      <rect x='160' y='650' width='620' height='18' fill='#cfc9c2'/>
    </g>
  </svg>`
);

const typeLabel: Record<string, string> = {
  reporting: "Investigations",
  explainer: "Analysis",
  perspective: "Voices",
  letter: "Dispatch",
};

const sectionCopy: Record<string, { title: string; description: string }> = {
  reporting: {
    title: "Investigations",
    description:
      "Our investigations track power, corruption, and influence across government, institutions, and media. The WriteWay follows the money, the policies, and the people affected by them.",
  },
  explainer: {
    title: "Analysis",
    description:
      "Our analysis section breaks down major events and policy shifts into clear, sourced reporting. We focus on what changed, why it matters, and who is impacted next.",
  },
  perspective: {
    title: "Voices",
    description:
      "Voices features sharp commentary from writers on politics, culture, and justice. We publish arguments meant to challenge assumptions and widen the conversation.",
  },
  letter: {
    title: "Dispatch",
    description:
      "Dispatch gathers short, urgent letters from the field: firsthand reporting, documented observations, and updates from stories still unfolding in real time.",
  },
};

export default function FeedPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [mediaMap, setMediaMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [reducedMotion, setReducedMotion] = useState(false);
  const feedRef = useRef<HTMLElement | null>(null);
  const leadRef = useRef<HTMLElement | null>(null);

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date()),
    []
  );

  function stripHtml(text: string) {
    return (text ?? "").replace(/<[^>]*>/g, " ");
  }

  function makeExcerpt(text: string, max = 220) {
    const clean = stripHtml(text).replace(/\s+/g, " ").trim();
    if (clean.length <= max) return clean;
    return clean.slice(0, max).trimEnd() + "...";
  }

  useEffect(() => {
    async function loadArticles() {
      setLoading(true);
      let query = supabase
        .from("articles")
        .select("*")
        .in("status", ["approved", "published"])
        .order("published_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("type", filter);
      }

      const { data } = await query;
      const list = (data as Article[]) || [];
      setArticles(list);

      if (list.length) {
        const { data: mediaRows } = await supabase
          .from("article_media")
          .select("article_id, url, sort_order")
          .in("article_id", list.map((a) => a.id))
          .order("sort_order", { ascending: true });

        const next: Record<string, string> = {};
        (mediaRows || []).forEach((row: any) => {
          if (!next[row.article_id]) next[row.article_id] = row.url;
        });
        setMediaMap(next);
      } else {
        setMediaMap({});
      }

      setLoading(false);
    }

    loadArticles();
  }, [filter]);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mql.matches);
    update();

    if (mql.addEventListener) mql.addEventListener("change", update);
    else mql.addListener(update);

    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", update);
      else mql.removeListener(update);
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const root = feedRef.current;
    if (!root) return;

    let ticking = false;
    const update = () => {
      ticking = false;
      if (!leadRef.current) return;

      const rect = leadRef.current.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const progress = clamp(1 - rect.top / viewport, 0, 1);
      const offset = (progress - 0.5) * 18;
      root.style.setProperty("--lead-parallax", `${offset.toFixed(2)}px`);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reducedMotion]);

  const filters = [
    { value: "all", label: "Home" },
    { value: "reporting", label: "Investigations" },
    { value: "explainer", label: "Analysis" },
    { value: "perspective", label: "Voices" },
    { value: "letter", label: "Dispatch" },
  ];

  const activeSection = sectionCopy[filter] || null;
  const leadStory = articles[0];
  const leadMedia = leadStory ? mediaMap[leadStory.id] : "";

  const nonLeadStories = leadStory ? articles.filter((story) => story.id !== leadStory.id) : [...articles];
  const topFeature = nonLeadStories[0] || null;
  const topSecondary = nonLeadStories[1] || null;
  const topTertiary = nonLeadStories[2] || null;
  const topRailStories = nonLeadStories.slice(3, 6);
  const showcasedIds = new Set<string>(
    [
      leadStory?.id,
      topFeature?.id,
      topSecondary?.id,
      topTertiary?.id,
      ...topRailStories.map((story) => story.id),
    ].filter((id): id is string => Boolean(id))
  );
  const lowerPool = articles.filter((story) => !showcasedIds.has(story.id));
  const dispatchStories = lowerPool.filter((story) => story.type === "letter").slice(0, 4);
  const voicesStories = lowerPool.filter((story) => story.type === "perspective").slice(0, 4);
  const sectionStories = articles.slice(0, 12);

  const renderFilterButtons = () =>
    filters.map((item) => (
      <button
        key={item.value}
        type="button"
        onClick={() => setFilter(item.value)}
        className={`feed-filter-btn ${filter === item.value ? "is-active" : ""}`}
      >
        {item.label}
      </button>
    ));

  return (
    <main className={`feed-root ${filter !== "all" ? "is-section-mode" : ""}`} ref={feedRef} data-reduced-motion={reducedMotion ? "true" : "false"}>
      <div className="feed-content">
        {filter === "all" ? (
          <>
            <header className="feed-masthead" ref={leadRef}>
              <div className="feed-container">
                {leadStory ? (
                  <Link href={`/articles/${leadStory.slug}`} className="feed-banner" aria-label={`Read ${leadStory.title}`}>
                    <div className="feed-banner-image" style={{ backgroundImage: `url(\"${leadMedia || leadImage}\")` }} aria-hidden />
                    <div className="feed-banner-overlay">
                      <h1>{leadStory.title}</h1>
                      <p>WriteWay Desk | {todayLabel}</p>
                    </div>
                  </Link>
                ) : (
                  <div className="feed-empty-hero">Front-page stories are loading.</div>
                )}
              </div>
            </header>

            <div className="feed-container">
              <div className="feed-filter-bar">
                <div className="feed-filter-group">{renderFilterButtons()}</div>
                <Link href="/help" className="feed-support-link">
                  Support Us
                </Link>
              </div>

              {loading ? (
                <div className="feed-loading">
                  <div className="feed-loading-lead" />
                  <div className="feed-loading-row">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="feed-loading-card" />
                    ))}
                  </div>
                  <div className="feed-loading-row">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="feed-loading-line" />
                    ))}
                  </div>
                </div>
              ) : articles.length === 0 ? (
                <div className="feed-empty">
                  <p>No published stories yet.</p>
                </div>
              ) : (
                <div className="home-body">
                  <section className="home-top-stories">
                    <h2>Top Stories</h2>
                    <div className="home-top-grid">
                      {topFeature && (
                        <>
                          <Link
                            href={`/articles/${topFeature.slug}`}
                            className="home-top-image home-top-image-1"
                            aria-label={`Read ${topFeature.title}`}
                            style={{ backgroundImage: `url(\"${mediaMap[topFeature.id] || leadImage}\")` }}
                          />
                          <article className="home-top-copy home-top-copy-1">
                            <span className="home-copy-bar" aria-hidden />
                            <Link href={`/articles/${topFeature.slug}`} className="home-top-copy-link" aria-label={`Read ${topFeature.title}`}>
                              <span className="feed-type">{typeLabel[topFeature.type] || "Story"}</span>
                              <h3>{topFeature.title}</h3>
                            </Link>
                            <div className="feed-meta">
                              <ArticleMeta article={topFeature} authorLink={false} />
                            </div>
                            <p>{makeExcerpt(topFeature.content, 170)}</p>
                          </article>
                        </>
                      )}

                      {topSecondary && (
                        <>
                          <article className="home-top-copy home-top-copy-2">
                            <span className="home-copy-bar" aria-hidden />
                            <Link href={`/articles/${topSecondary.slug}`} className="home-top-copy-link" aria-label={`Read ${topSecondary.title}`}>
                              <span className="feed-type">{typeLabel[topSecondary.type] || "Story"}</span>
                              <h3>{topSecondary.title}</h3>
                            </Link>
                            <div className="feed-meta">
                              <ArticleMeta article={topSecondary} authorLink={false} />
                            </div>
                            <p>{makeExcerpt(topSecondary.content, 170)}</p>
                          </article>
                          <Link
                            href={`/articles/${topSecondary.slug}`}
                            className="home-top-image home-top-image-2"
                            aria-label={`Read ${topSecondary.title}`}
                            style={{ backgroundImage: `url(\"${mediaMap[topSecondary.id] || leadImage}\")` }}
                          />
                        </>
                      )}

                      {topTertiary && (
                        <>
                          <Link
                            href={`/articles/${topTertiary.slug}`}
                            className="home-top-image home-top-image-3"
                            aria-label={`Read ${topTertiary.title}`}
                            style={{ backgroundImage: `url(\"${mediaMap[topTertiary.id] || leadImage}\")` }}
                          />
                          <article className="home-top-copy home-top-copy-3">
                            <span className="home-copy-bar" aria-hidden />
                            <Link href={`/articles/${topTertiary.slug}`} className="home-top-copy-link" aria-label={`Read ${topTertiary.title}`}>
                              <span className="feed-type">{typeLabel[topTertiary.type] || "Story"}</span>
                              <h3>{topTertiary.title}</h3>
                            </Link>
                            <div className="feed-meta">
                              <ArticleMeta article={topTertiary} authorLink={false} />
                            </div>
                            <p>{makeExcerpt(topTertiary.content, 170)}</p>
                          </article>
                        </>
                      )}

                      <aside className="home-rail-list">
                        {topRailStories.map((story, index) => (
                          <Link key={story.id} href={`/articles/${story.slug}`} className={`home-rail-item home-rail-item-${index + 1}`} aria-label={`Read ${story.title}`}>
                            <span className="home-copy-bar" aria-hidden />
                            <div className="home-rail-thumb" style={{ backgroundImage: `url(\"${mediaMap[story.id] || leadImage}\")` }} aria-hidden />
                            <div>
                              <span className="feed-type">{typeLabel[story.type] || "Story"}</span>
                              <h4>{story.title}</h4>
                              <div className="feed-meta">
                                <ArticleMeta article={story} authorLink={false} />
                              </div>
                            </div>
                          </Link>
                        ))}
                      </aside>
                    </div>
                  </section>

                  <section className="home-lower">
                    <div className="home-lower-column">
                      <h3>Dispatch</h3>
                      <div className="home-lower-grid">
                        {dispatchStories.map((story) => (
                          <Link key={story.id} href={`/articles/${story.slug}`} className="home-lower-item" aria-label={`Read ${story.title}`}>
                            <div className="home-lower-thumb" style={{ backgroundImage: `url(\"${mediaMap[story.id] || leadImage}\")` }} aria-hidden />
                            <div>
                              <span className="feed-type">{typeLabel[story.type] || "Story"}</span>
                              <h4>{story.title}</h4>
                            </div>
                          </Link>
                        ))}
                        {dispatchStories.length === 0 && (
                          <p className="text-body text-charcoal/60">No dispatch stories yet.</p>
                        )}
                      </div>
                    </div>

                    <div className="home-lower-column">
                      <h3>Voices</h3>
                      <div className="home-lower-grid">
                        {voicesStories.map((story) => (
                          <Link key={story.id} href={`/articles/${story.slug}`} className="home-lower-item" aria-label={`Read ${story.title}`}>
                            <div className="home-lower-thumb" style={{ backgroundImage: `url(\"${mediaMap[story.id] || leadImage}\")` }} aria-hidden />
                            <div>
                              <span className="feed-type">{typeLabel[story.type] || "Story"}</span>
                              <h4>{story.title}</h4>
                            </div>
                          </Link>
                        ))}
                        {voicesStories.length === 0 && (
                          <p className="text-body text-charcoal/60">No voices stories yet.</p>
                        )}
                      </div>
                    </div>

                    <aside className="home-newsletter">
                      <p className="home-newsletter-brand">The WriteWay</p>
                      <h4>Join Our Newsletter</h4>
                      <p>Original reporting and fearless journalism, delivered to you.</p>
                      <input type="email" placeholder="Enter your email address" aria-label="Email address" />
                      <button type="button">I&apos;m In</button>
                    </aside>
                  </section>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <header className="section-masthead">
              <div className="section-brand-block">
                <button type="button" className="section-menu" aria-label="Open menu">
                  <span />
                  <span />
                  <span />
                </button>
                <button type="button" className="section-brand-home" onClick={() => setFilter("all")}>
                  The WriteWay_
                </button>
              </div>

              <div className="section-topic-strip">
                <div className="feed-filter-group">{renderFilterButtons()}</div>
                <Link href="/help" className="feed-support-link">
                  Support Us
                </Link>
              </div>
            </header>

            <div className="feed-container">
              {loading ? (
                <div className="feed-loading">
                  <div className="feed-loading-lead" />
                  <div className="feed-loading-row">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="feed-loading-card" />
                    ))}
                  </div>
                </div>
              ) : articles.length === 0 ? (
                <div className="feed-empty">
                  <p>No stories available in this section yet.</p>
                </div>
              ) : (
                <section className="section-page">
                  <h1>{activeSection?.title || "Section"}</h1>
                  <p>{activeSection?.description || "Selected stories from The WriteWay editorial desk."}</p>
                  <button type="button" className="section-share-btn">
                    Share
                  </button>

                  <div className="section-story-list">
                    {sectionStories.map((story) => (
                      <Link key={story.id} href={`/articles/${story.slug}`} className="section-story-row" aria-label={`Read ${story.title}`}>
                        <div className="section-story-image" style={{ backgroundImage: `url(\"${mediaMap[story.id] || leadImage}\")` }} aria-hidden />
                        <div className="section-story-main">
                          <span className="feed-type">{typeLabel[story.type] || "Story"}</span>
                          <h3>{story.title}</h3>
                          <div className="feed-meta">
                            <ArticleMeta article={story} authorLink={false} />
                          </div>
                          <p className="section-story-side">{makeExcerpt(story.content, 100)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
