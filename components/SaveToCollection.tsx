"use client";

import { useEffect, useState } from "react";
import { useUser } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { addToCollection, ensurePrimaryCollection, removeFromCollection } from "../lib/social";

type Message = { type: "success" | "error"; text: string } | null;

export default function SaveToCollection({
  articleId,
  articleTitle,
}: {
  articleId: string;
  articleTitle: string;
}) {
  const { user } = useUser();
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user?.id) return;
      const primary = await ensurePrimaryCollection(user.id);
      if (!primary?.id) return;
      setCollectionId(primary.id);
      const { data } = await supabase
        .from("collection_items")
        .select("id")
        .eq("collection_id", primary.id)
        .eq("article_id", articleId)
        .maybeSingle();
      setSaved(!!data);
    }
    load();
  }, [user?.id, articleId]);

  async function handleToggle() {
    if (!user?.id || !collectionId) return;
    setSaving(true);
    setMessage(null);
    if (saved) {
      const { error } = await removeFromCollection(collectionId, articleId);
      if (error) {
        setMessage({ type: "error", text: "Could not remove yet." });
      } else {
        setSaved(false);
      }
      setSaving(false);
      return;
    }
    const { error } = await addToCollection(collectionId, articleId);
    if (error) {
      setMessage({
        type: "error",
        text: error.code === "23505" ? "Already saved." : "Could not save yet.",
      });
    } else {
      setSaved(true);
      setMessage({ type: "success", text: "Saved." });
    }
    setSaving(false);
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-charcoal/10 bg-white/90 p-5 shadow-soft">
        <p className="text-meta text-charcoal/60 mb-2">Save this piece</p>
        <p className="text-sm text-charcoal/70">
          Log in to keep <span className="font-semibold">{articleTitle}</span> in your shelf.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-charcoal/10 bg-white/90 p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-meta text-charcoal/60">Your saved shelf</p>
          <p className="text-sm text-charcoal/70">
            Keep this article close for later reflection.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-primary text-sm" onClick={handleToggle} disabled={saving}>
            {saving ? "Saving..." : saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>
      {message && (
        <p className={`mt-3 text-xs ${message.type === "success" ? "text-hope" : "text-urgency"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
