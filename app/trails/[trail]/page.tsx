"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import ArticleMeta from "../../../components/ArticleMeta";
import { Article } from "../../../types/article";

export default function TrailPage() {
  const params = useParams();
  const rawTrail = params?.trail;
  const trail = Array.isArray(rawTrail) ? rawTrail[0] : (rawTrail ?? "hope");
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      // Simple keyword filter fallback if tags aren't implemented
      const keyword = trail.replace('-', ' ');
      const { data } = await supabase
        .from('articles')
        .select('*')
        .in('status', ['approved', 'published'])
        .order('published_at', { ascending: false });
      const all = (data as Article[]) || [];
      const filtered = all.filter(a => {
        const text = `${a.title} ${a.content}`.toLowerCase();
        return text.includes(keyword.toLowerCase()) || (keyword.toLowerCase() === 'change' && a.type === 'reporting');
      });
      setArticles(filtered.length ? filtered : all.slice(0, 10));
      setLoading(false);
    }
    load();
  }, [trail]);

  const trailTitles: Record<string, { title: string; intro: string }> = {
    hope: { title: 'Hope', intro: 'A selection of stories about solutions, resilience, and progress.' },
    change: { title: 'Change', intro: 'Stories about shifts in policy, culture, and community action.' },
    'hard-things': { title: 'Hard Things', intro: 'Honest reporting on difficult topics and lived experience.' },
  };

  const info = trailTitles[trail] || { title: trail, intro: '' };

  return (
    <main className="min-h-screen py-16">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <Link href="/" className="text-sm text-charcoal/70 mb-6 inline-block">&lt; Back to Home</Link>
        <header className="mb-8">
          <h1 className="font-display text-4xl font-bold mb-3">{info.title}</h1>
          <p className="text-charcoal/75">{info.intro}</p>
        </header>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-charcoal/5 rounded animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-12">
            {articles.map(a => (
              <article key={a.id} className="pt-6 border-t border-charcoal/10">
                <Link href={`/articles/${a.slug}`} className="group block">
                  <h2 className="font-display text-2xl mb-2">{a.title}</h2>
                </Link>
                <p className="text-charcoal/75 line-clamp-3">{a.content}</p>
                <div className="mt-3 text-meta text-charcoal-muted">
                  <ArticleMeta article={a} />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
