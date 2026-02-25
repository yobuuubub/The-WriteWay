"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useUser } from "../../../lib/auth";
import { supabase } from "../../../lib/supabase";
import { getArticleTypeLabel } from "../../../lib/article-type-label";
import type { Collection, CollectionItem } from "../../../types/social";
import type { Article } from "../../../types/article";

type CollectionWithOwner = Collection & {
  owner?: { display_name?: string; handle?: string | null } | null;
};

type ItemWithArticle = CollectionItem & {
  articles?: Article | null;
};

export default function CollectionPage() {
  const params = useParams();
  const collectionId = params?.collectionId as string;
  const { user } = useUser();

  const [collection, setCollection] = useState<CollectionWithOwner | null>(null);
  const [items, setItems] = useState<ItemWithArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCollection() {
      if (!collectionId) return;
      setLoading(true);
      const { data: collectionData } = await supabase
        .from("collections")
        .select("id, owner_id, title, description, visibility, created_at, users:users!collections_owner_id_fkey(display_name, handle)")
        .eq("id", collectionId)
        .single();

      if (!collectionData) {
        setCollection(null);
        setLoading(false);
        return;
      }

      setCollection({
        ...(collectionData as Collection),
        owner: (collectionData as any).users || null,
      });

      const { data: itemData } = await supabase
        .from("collection_items")
        .select("id, collection_id, article_id, created_at, articles(id, title, slug, type, published_at, content)")
        .eq("collection_id", collectionId)
        .order("created_at", { ascending: false });

      const normalizedItems: ItemWithArticle[] = (itemData || []).map((row: any) => {
        const articleValue = Array.isArray(row.articles) ? row.articles[0] || null : row.articles || null;
        return {
          id: row.id,
          collection_id: row.collection_id,
          article_id: row.article_id,
          created_at: row.created_at,
          articles: articleValue,
        };
      });

      setItems(normalizedItems);
      setLoading(false);
    }

    loadCollection();
  }, [collectionId]);

  async function handleRemoveItem(itemId: string) {
    if (!user?.id || !collection || user.id !== collection.owner_id) return;
    await supabase.from("collection_items").delete().eq("id", itemId);
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-charcoal/20 border-t-calm rounded-full animate-spin" />
      </main>
    );
  }

  if (!collection) {
    return (
      <main className="min-h-screen flex items-center justify-center py-24">
        <div className="text-center max-w-md">
          <h1 className="font-display text-2xl text-charcoal mb-3">Collection not found</h1>
          <Link href="/feed" className="btn-primary inline-flex">
            Back to feed
          </Link>
        </div>
      </main>
    );
  }

  const isOwner = !!user?.id && user.id === collection.owner_id;
  const ownerHandle = collection.owner?.handle || null;
  const ownerLabel = collection.owner?.display_name || ownerHandle;

  return (
    <main className="min-h-screen bg-paper py-10">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 space-y-8">
        <Link href={ownerHandle ? `/profiles/${ownerHandle}` : "/feed"} className="text-meta text-charcoal/60 hover:text-charcoal">
          {ownerHandle ? `@${ownerHandle} profile` : ownerLabel ? `${ownerLabel} profile` : "Back to feed"}
        </Link>

        <section className="rounded-3xl border border-charcoal/10 bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-meta text-charcoal/60">Saved shelf</p>
              <h1 className="font-display text-3xl text-charcoal">{collection.title || "Saved"}</h1>
              {collection.description && (
                <p className="text-charcoal/70 mt-2">{collection.description}</p>
              )}
              <p className="text-charcoal/60 mt-3 text-sm">
                Visibility: {collection.visibility} {isOwner ? "(editable in profile)" : ""}
              </p>
            </div>
            <div className="text-sm text-charcoal/60">
              {collection.owner?.display_name && (
                <span>Curated by {collection.owner.display_name}</span>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-charcoal/10 bg-white p-6 shadow-soft">
          <p className="text-meta text-charcoal/60">Shelf contents</p>
          {items.length === 0 ? (
            <p className="text-charcoal/70 mt-4">No articles saved yet.</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={item.articles?.slug ? `/articles/${item.articles.slug}` : "/feed"}
                  className="rounded-2xl border border-charcoal/10 bg-paper/60 p-5 hover:-translate-y-0.5 transition"
                >
                  <p className="text-meta text-charcoal/60 capitalize">{getArticleTypeLabel(item.articles?.type || "")}</p>
                  <h3 className="font-display text-xl text-charcoal mt-2">{item.articles?.title}</h3>
                  <p className="text-charcoal/70 mt-2">
                    {item.articles?.content?.slice(0, 140)}...
                  </p>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        handleRemoveItem(item.id);
                      }}
                      className="mt-4 text-xs text-urgency hover:underline underline-offset-4"
                    >
                      Remove from shelf
                    </button>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
