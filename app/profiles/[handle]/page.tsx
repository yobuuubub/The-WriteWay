"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "../../../lib/auth";
import { supabase } from "../../../lib/supabase";
import {
  ensurePrimaryCollection,
  fetchCollectionItemCount,
  fetchFollowCounts,
  fetchFollowStatus,
  fetchProfileByHandle,
  followWriter,
  unfollowWriter,
} from "../../../lib/social";
import type { Article } from "../../../types/article";
import type { Collection } from "../../../types/social";
import type { User } from "../../../types/user";
import type { Notification } from "../../../types/social";
import { getArticleTypeLabel } from "../../../lib/article-type-label";

type WriterCard = {
  id: string;
  display_name: string;
  handle?: string | null;
  avatar_url?: string | null;
  tagline?: string | null;
};

function initials(name?: string | null) {
  if (!name) return "YL";
  const parts = name.trim().split(" ");
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function normalizeHandle(input: string) {
  return (input || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const handle = ((params?.handle as string) || "").toLowerCase();
  const { user } = useUser();

  const [profile, setProfile] = useState<User | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [primaryCollection, setPrimaryCollection] = useState<Collection | null>(null);
  const [collectionCount, setCollectionCount] = useState(0);
  const [collectionItems, setCollectionItems] = useState<Article[]>([]);
  const [followingWriters, setFollowingWriters] = useState<WriterCard[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [articleCount, setArticleCount] = useState(0);
  const [articleStats, setArticleStats] = useState<Record<string, { responses: number; saves: number }>>({});
  const [notifications, setNotifications] = useState<(Notification & { actor?: { display_name?: string } | null; articles?: { title?: string; slug?: string } | null; })[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saveState, setSaveState] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "saved" | "following" | "updates">("posts");
  const [form, setForm] = useState({
    display_name: "",
    handle: "",
    bio: "",
    tagline: "",
    avatar_url: "",
    cover_url: "",
  });

  const isOwner = !!user?.id && user.id === profile?.id;
  const isWriter = useMemo(() => {
    if (!profile) return false;
    return profile.role && profile.role !== "reader" ? true : articleCount > 0;
  }, [profile, articleCount]);

  function stripHtml(text: string) {
    return (text ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  useEffect(() => {
    async function loadProfile() {
      if (!handle) return;
      setLoading(true);
      let profileData = await fetchProfileByHandle(handle);
      if (!profileData) {
        const { data: byId } = await supabase
          .from("users")
          .select("id, display_name, handle, bio, avatar_url, cover_url, tagline, role, age_range, country, created_at")
          .eq("id", handle)
          .maybeSingle();
        profileData = (byId as User) || null;
      }
      if (!profileData && user?.id && handle === user.id) {
        const displayName = user.email ? user.email.split("@")[0] : "User";
        const { data: created } = await supabase
          .from("users")
          .upsert([{ id: user.id, display_name: displayName, handle: normalizeHandle(displayName) }], {
            onConflict: "id",
          })
          .select("id, display_name, handle, bio, avatar_url, cover_url, tagline, role, age_range, country, created_at")
          .single();
        profileData = (created as User) || null;
      }
      if (!profileData) {
        setProfile(null);
        setLoading(false);
        return;
      }
      setProfile(profileData);
      setForm({
        display_name: profileData.display_name || "",
        handle: profileData.handle || "",
        bio: profileData.bio || "",
        tagline: profileData.tagline || "",
        avatar_url: profileData.avatar_url || "",
        cover_url: profileData.cover_url || "",
      });

      const [{ data: articleData }, articleCountResult, counts] = await Promise.all([
        supabase
          .from("articles")
          .select("id, title, slug, type, content, published_at, created_at")
          .eq("author_id", profileData.id)
          .in("status", ["approved", "published"])
          .order("published_at", { ascending: false })
          .limit(12),
        supabase
          .from("articles")
          .select("id", { count: "exact", head: true })
          .eq("author_id", profileData.id)
          .in("status", ["approved", "published"]),
        fetchFollowCounts(profileData.id),
      ]);

      setArticles((articleData as Article[]) || []);
      setArticleCount(articleCountResult.count || 0);
      setFollowerCount(counts.followerCount);
      setFollowingCount(counts.followingCount);

      const articleIds = (articleData as Article[] | null)?.map((a) => a.id) || [];
      if (articleIds.length > 0) {
        const { data: discussions } = await supabase
          .from("discussions")
          .select("id, article_id")
          .in("article_id", articleIds);
        const discussionIds = (discussions || []).map((d: any) => d.id);
        const responseCounts: Record<string, number> = {};
        if (discussionIds.length > 0) {
          const { data: postRows } = await supabase
            .from("posts")
            .select("discussion_id")
            .in("discussion_id", discussionIds);
          (postRows || []).forEach((row: any) => {
            responseCounts[row.discussion_id] = (responseCounts[row.discussion_id] || 0) + 1;
          });
        }
        const { data: saveRows } = await supabase
          .from("collection_items")
          .select("article_id")
          .in("article_id", articleIds);
        const saveCounts: Record<string, number> = {};
        (saveRows || []).forEach((row: any) => {
          saveCounts[row.article_id] = (saveCounts[row.article_id] || 0) + 1;
        });
        const statsMap: Record<string, { responses: number; saves: number }> = {};
        (discussions || []).forEach((d: any) => {
          statsMap[d.article_id] = {
            responses: responseCounts[d.id] || 0,
            saves: saveCounts[d.article_id] || 0,
          };
        });
        articleIds.forEach((id) => {
          if (!statsMap[id]) statsMap[id] = { responses: 0, saves: saveCounts[id] || 0 };
        });
        setArticleStats(statsMap);
      } else {
        setArticleStats({});
      }

      if (user?.id) {
        const status = await fetchFollowStatus(user.id, profileData.id);
        setIsFollowing(status);
      } else {
        setIsFollowing(false);
      }

      const includePrivate = user?.id === profileData.id;
      let primary: Collection | null = null;
      if (includePrivate) {
        primary = await ensurePrimaryCollection(profileData.id);
      } else {
        const { data: publicCollections } = await supabase
          .from("collections")
          .select("id, owner_id, title, description, visibility, created_at, updated_at")
          .eq("owner_id", profileData.id)
          .in("visibility", ["public", "unlisted"])
          .order("created_at", { ascending: true })
          .limit(1);
        primary = (publicCollections?.[0] as Collection) || null;
      }
      setPrimaryCollection(primary);
      setCollectionCount(primary ? await fetchCollectionItemCount(primary.id) : 0);
      if (primary) {
        const { data: items } = await supabase
          .from("collection_items")
          .select("articles(id, title, slug, type, content)")
          .eq("collection_id", primary.id)
          .order("created_at", { ascending: false })
          .limit(6);
        const list = (items || [])
          .map((row: any) => row.articles)
          .filter(Boolean) as Article[];
        setCollectionItems(list);
      } else {
        setCollectionItems([]);
      }

      const { data: followRows } = await supabase
        .from("follows")
        .select("writer_id")
        .eq("follower_id", profileData.id);
      const writerIds = (followRows || []).map((row: any) => row.writer_id);
      if (writerIds.length) {
        const { data: writerRows } = await supabase
          .from("users")
          .select("id, display_name, handle, avatar_url, tagline")
          .in("id", writerIds)
          .limit(12);
        setFollowingWriters((writerRows as WriterCard[]) || []);
      } else {
        setFollowingWriters([]);
      }

      if (user?.id === profileData.id) {
        const { data: noteRows } = await supabase
          .from("notifications")
          .select("id, user_id, actor_id, article_id, type, is_read, created_at, articles(title, slug), actor:users!notifications_actor_id_fkey(display_name)")
          .eq("user_id", profileData.id)
          .order("created_at", { ascending: false })
          .limit(10);
        setNotifications((noteRows as any) || []);
      } else {
        setNotifications([]);
      }

      setLoading(false);
    }

    loadProfile();
  }, [handle, user?.id, user?.email]);

  async function handleFollowToggle() {
    if (!user?.id || !profile || user.id === profile.id) return;
    if (isFollowing) {
      await unfollowWriter(user.id, profile.id);
      setIsFollowing(false);
      setFollowerCount((c) => Math.max(0, c - 1));
      return;
    }
    const { error } = await followWriter(user.id, profile.id);
    if (!error) {
      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
    }
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaveState(null);
    const nextHandle = normalizeHandle(form.handle || form.display_name);
    const payload = {
      display_name: form.display_name.trim() || profile.display_name,
      handle: nextHandle || profile.handle,
      bio: form.bio.trim() || null,
      tagline: form.tagline.trim() || null,
      avatar_url: form.avatar_url.trim() || null,
      cover_url: form.cover_url.trim() || null,
    };
    const { error } = await supabase.from("users").update(payload).eq("id", profile.id);
    if (error) {
      setSaveState(error.code === "23505" ? "That handle is already taken." : "Could not save profile.");
      return;
    }
    setProfile({ ...profile, ...payload });
    setEditMode(false);
    setSaveState("Saved.");
    if (profile.handle !== payload.handle && payload.handle) {
      router.push("/profiles/" + payload.handle);
    }
  }

  async function handleAvatarUpload(file: File | null) {
    if (!file || !profile) return;
    setAvatarError(null);
    setAvatarUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      setAvatarError("Upload failed. Check the avatars bucket.");
      setAvatarUploading(false);
      return;
    }
    const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = publicData.publicUrl;
    const { error: updateError } = await supabase.from("users").update({ avatar_url: url }).eq("id", profile.id);
    if (updateError) {
      setAvatarError("Could not save avatar.");
      setAvatarUploading(false);
      return;
    }
    setProfile({ ...profile, avatar_url: url });
    setForm({ ...form, avatar_url: url });
    setAvatarUploading(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-charcoal/20 border-t-calm rounded-full animate-spin" />
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen flex items-center justify-center py-24">
        <div className="text-center max-w-md">
          <h1 className="font-display text-2xl text-charcoal mb-3">Profile not found</h1>
          <p className="text-charcoal/70 mb-6">This handle does not exist yet.</p>
          <Link href="/feed" className="btn-primary inline-flex">
            Back to feed
          </Link>
        </div>
      </main>
    );
  }

  const joinedYear = profile.created_at ? new Date(profile.created_at).getFullYear() : null;

  return (
    <main className="min-h-screen bg-paper pb-16 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-calm/20 blur-3xl" />
        <div className="absolute top-32 -right-16 h-80 w-80 rounded-full bg-hope/20 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-64 w-64 rounded-full bg-emotion/15 blur-3xl" />
      </div>
      <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-10">
        <section className="rounded-3xl border border-charcoal/10 bg-gradient-to-br from-white via-paper-warm to-calm-soft/40 p-6 sm:p-8 shadow-soft">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
            <div className="mx-auto sm:mx-0">
              <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-full border-4 border-white bg-gradient-to-br from-calm-soft to-hope-soft shadow-[0_18px_40px_-28px_rgba(44,82,130,0.7)] flex items-center justify-center overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.display_name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-semibold text-charcoal">{initials(profile.display_name)}</span>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-sans text-2xl text-charcoal tracking-tight">@{profile.handle || "reader"}</h1>
                {!isOwner && user && (
                  <button
                    onClick={handleFollowToggle}
                    className={
                      "px-4 py-2 rounded-lg text-sm font-medium transition " +
                      (isFollowing ? "bg-charcoal text-paper" : "bg-gradient-to-r from-calm to-hope text-white")
                    }
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                )}
                {!isOwner && !user && (
                  <Link href="/login" className="btn-secondary text-sm">
                    Log in
                  </Link>
                )}
                {isOwner && (
                  <button onClick={() => setEditMode((v) => !v)} className="btn-secondary text-sm">
                    {editMode ? "Close edit" : "Edit profile"}
                  </button>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-charcoal/80">
                <span className="rounded-full bg-calm-soft/80 border border-calm/20 px-3 py-1"><strong className="text-charcoal">{articleCount}</strong> posts</span>
                <span className="rounded-full bg-hope-soft/80 border border-hope/20 px-3 py-1"><strong className="text-charcoal">{followerCount}</strong> followers</span>
                <span className="rounded-full bg-emotion-soft/70 border border-emotion/20 px-3 py-1"><strong className="text-charcoal">{followingCount}</strong> following</span>
                <span className="rounded-full bg-secondary-soft/80 border border-secondary/20 px-3 py-1"><strong className="text-charcoal">{collectionCount}</strong> saved</span>
              </div>
              <div className="mt-4">
                <p className="font-semibold text-charcoal">{profile.display_name}</p>
                {profile.tagline && <p className="text-charcoal/85 mt-1">{profile.tagline}</p>}
                {profile.bio && <p className="text-charcoal/70 mt-1 whitespace-pre-wrap">{profile.bio}</p>}
                <p className="text-xs text-charcoal/55 mt-2">
                  Joined {joinedYear ?? "Unknown"}{profile.country ? ` - ${profile.country}` : ""}
                </p>
              </div>
            </div>
          </div>
        </section>

        {editMode && isOwner && (
          <section className="mt-8 rounded-2xl border border-charcoal/10 bg-white/90 p-6 shadow-soft">
            <h2 className="font-display text-2xl text-charcoal mb-4">Edit profile</h2>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleProfileSave}>
              <label className="flex flex-col gap-2 text-sm text-charcoal/70">
                Display name
                <input className="rounded-lg border border-charcoal/15 bg-paper px-3 py-2 text-sm" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
              </label>
              <label className="flex flex-col gap-2 text-sm text-charcoal/70">
                Handle
                <input className="rounded-lg border border-charcoal/15 bg-paper px-3 py-2 text-sm" value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} />
              </label>
              <label className="flex flex-col gap-2 text-sm text-charcoal/70 md:col-span-2">
                Tagline
                <input className="rounded-lg border border-charcoal/15 bg-paper px-3 py-2 text-sm" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
              </label>
              <label className="flex flex-col gap-2 text-sm text-charcoal/70 md:col-span-2">
                Bio
                <textarea className="rounded-lg border border-charcoal/15 bg-paper px-3 py-2 text-sm min-h-[120px]" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
              </label>
              <label className="flex flex-col gap-2 text-sm text-charcoal/70">
                Avatar URL
                <input className="rounded-lg border border-charcoal/15 bg-paper px-3 py-2 text-sm" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} />
              </label>
              <label className="flex flex-col gap-2 text-sm text-charcoal/70">
                Upload avatar
                <input type="file" accept="image/*" className="rounded-lg border border-charcoal/15 bg-paper px-3 py-2 text-sm" onChange={(e) => handleAvatarUpload(e.target.files?.[0] || null)} />
                {avatarUploading && <span className="text-xs text-charcoal/60">Uploading...</span>}
                {avatarError && <span className="text-xs text-urgency">{avatarError}</span>}
              </label>
              <label className="flex flex-col gap-2 text-sm text-charcoal/70 md:col-span-2">
                Cover URL
                <input className="rounded-lg border border-charcoal/15 bg-paper px-3 py-2 text-sm" value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} />
              </label>
              <div className="md:col-span-2 flex items-center gap-4">
                <button className="btn-primary text-sm" type="submit">Save changes</button>
                {saveState && <span className="text-sm text-charcoal/70">{saveState}</span>}
              </div>
            </form>
          </section>
        )}

        <section className="mt-8 border-t border-charcoal/10">
          <div className="flex items-center justify-center gap-3 sm:gap-4 text-xs uppercase tracking-[0.2em]">
            <button className={`py-3 px-3 rounded-full border ${activeTab === "posts" ? "bg-calm text-white border-calm" : "text-charcoal/60 border-transparent hover:bg-calm-soft/60"}`} onClick={() => setActiveTab("posts")}>Posts</button>
            <button className={`py-3 px-3 rounded-full border ${activeTab === "saved" ? "bg-secondary text-white border-secondary" : "text-charcoal/60 border-transparent hover:bg-secondary-soft/80"}`} onClick={() => setActiveTab("saved")}>Saved</button>
            <button className={`py-3 px-3 rounded-full border ${activeTab === "following" ? "bg-hope text-white border-hope" : "text-charcoal/60 border-transparent hover:bg-hope-soft/80"}`} onClick={() => setActiveTab("following")}>Following</button>
            {isOwner && (
              <button className={`py-3 px-3 rounded-full border ${activeTab === "updates" ? "bg-emotion text-white border-emotion" : "text-charcoal/60 border-transparent hover:bg-emotion-soft/80"}`} onClick={() => setActiveTab("updates")}>Updates</button>
            )}
          </div>
        </section>

        {activeTab === "posts" && (
          <section className="mt-6">
            {articles.length === 0 ? (
              <p className="text-center text-charcoal/65 py-10">No published posts yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {articles.map((article) => (
                  <Link key={article.id} href={"/articles/" + article.slug} className="group aspect-square rounded-lg border border-charcoal/10 bg-gradient-to-br from-paper-warm to-calm-soft/30 p-4 hover:from-white hover:to-calm-soft/40 transition">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-charcoal/50">{getArticleTypeLabel(article.type)}</p>
                    <h3 className="font-display text-lg text-charcoal mt-2 line-clamp-2">{article.title}</h3>
                    <p className="mt-2 text-sm text-charcoal/65 line-clamp-4">{stripHtml(article.content)}</p>
                    <p className="mt-3 text-xs text-charcoal/50">{articleStats[article.id]?.responses || 0} responses - {articleStats[article.id]?.saves || 0} saves</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "saved" && (
          <section className="mt-6">
            {!primaryCollection ? (
              <p className="text-center text-charcoal/65 py-10">{isOwner ? "Save your first article to start this section." : "No public saved items."}</p>
            ) : collectionItems.length === 0 ? (
              <p className="text-center text-charcoal/65 py-10">No saved items yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {collectionItems.map((item) => (
                  <Link key={item.id} href={"/articles/" + item.slug} className="group aspect-square rounded-lg border border-charcoal/10 bg-gradient-to-br from-paper-warm to-secondary-soft p-4 hover:from-white hover:to-secondary-soft/70 transition">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-charcoal/50">{getArticleTypeLabel(item.type)}</p>
                    <h3 className="font-display text-lg text-charcoal mt-2 line-clamp-2">{item.title}</h3>
                    <p className="mt-2 text-sm text-charcoal/65 line-clamp-4">{stripHtml(item.content)}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "following" && (
          <section className="mt-6">
            {followingWriters.length === 0 ? (
              <p className="text-center text-charcoal/65 py-10">Not following any writers yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {followingWriters.map((writer) => (
                  <Link key={writer.id} href={writer.handle ? "/profiles/" + writer.handle : "/feed"} className="rounded-lg border border-charcoal/10 bg-gradient-to-br from-white to-hope-soft/50 p-4 shadow-soft hover:to-hope-soft/80 transition">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-paper border border-charcoal/10 flex items-center justify-center overflow-hidden">
                        {writer.avatar_url ? (
                          <img src={writer.avatar_url} alt={writer.display_name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-sm font-semibold text-charcoal">{initials(writer.display_name)}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-charcoal">{writer.display_name}</p>
                        <p className="text-xs text-charcoal/60">@{writer.handle || "writer"}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {isOwner && activeTab === "updates" && (
          <section className="mt-6">
            {notifications.length === 0 ? (
              <p className="text-center text-charcoal/65 py-10">You're all caught up.</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((note) => (
                  <div key={note.id} className={"rounded-lg border border-charcoal/10 bg-gradient-to-br from-white to-emotion-soft/50 p-4 shadow-soft " + (note.is_read ? "opacity-70" : "")}>
                    <p className="text-sm text-charcoal/80">
                      <span className="font-semibold">{note.actor?.display_name || "A writer"}</span>{" "}
                      published{" "}
                      <Link href={note.articles?.slug ? "/articles/" + note.articles.slug : "/feed"} className="text-calm hover:underline underline-offset-4">
                        {note.articles?.title || "a new article"}
                      </Link>.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
