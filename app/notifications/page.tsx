"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import type { Notification } from "../../types/social";

type NotificationRow = Notification & {
  articles?: { title?: string; slug?: string } | null;
  actor?: { display_name?: string; handle?: string | null } | null;
};

function relativeTime(dateStr?: string | null) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user?.id) {
        setNotifications([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from("notifications")
        .select(
          "id, user_id, actor_id, article_id, type, is_read, created_at, articles(title, slug), actor:users!notifications_actor_id_fkey(display_name, handle)"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setNotifications((data as NotificationRow[]) || []);
      setLoading(false);
    }
    load();
  }, [user?.id]);

  async function markAllRead() {
    if (!notifications.length) return;
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (!unreadIds.length) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function markOneRead(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center py-24">
        <div className="text-center max-w-md">
          <h1 className="font-display text-2xl text-charcoal mb-3">Notifications</h1>
          <p className="text-charcoal/70 mb-6">Log in to see updates from writers you follow.</p>
          <Link href="/login" className="btn-primary inline-flex">
            Log in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper py-10">
      <div className="max-w-4xl mx-auto px-5 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-meta text-charcoal/60">Inbox</p>
            <h1 className="font-display text-3xl text-charcoal">Notifications</h1>
          </div>
          <button onClick={markAllRead} className="btn-secondary text-sm">
            Mark all read
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {loading && (
            <div className="w-8 h-8 border-2 border-charcoal/20 border-t-calm rounded-full animate-spin" />
          )}
          {!loading && notifications.length === 0 && (
            <p className="text-charcoal/70">You&apos;re all caught up.</p>
          )}
          {notifications.map((note) => (
            <div
              key={note.id}
              className={`rounded-2xl border border-charcoal/10 bg-white p-4 shadow-soft flex flex-wrap items-center justify-between gap-3 ${
                note.is_read ? "opacity-70" : ""
              }`}
            >
              <div>
                <p className="text-charcoal/80">
                  <span className="font-semibold">
                    {note.actor?.display_name || "A writer"}
                  </span>{" "}
                  published{" "}
                  <Link
                    href={note.articles?.slug ? `/articles/${note.articles.slug}` : "/feed"}
                    className="text-calm hover:underline underline-offset-4"
                  >
                    {note.articles?.title || "a new article"}
                  </Link>
                  .
                </p>
                <p className="text-xs text-charcoal/60 mt-1">{relativeTime(note.created_at)}</p>
              </div>
              {!note.is_read && (
                <button
                  onClick={() => markOneRead(note.id)}
                  className="text-xs text-charcoal/60 hover:text-charcoal"
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
