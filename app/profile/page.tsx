"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { safeGetAccessToken } from "../../lib/auth-session";

export default function ProfileRedirectPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    handle: "",
    bio: "",
    tagline: "",
  });
  const [saving, setSaving] = useState(false);
  function normalizeHandle(input: string) {
    const base = (input || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 24);
    return base || "reader";
  }

  useEffect(() => {
    async function go() {
      if (loading) return;
      if (!user) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("users")
        .select("handle, display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.handle) {
        router.push(`/profiles/${data.handle}`);
        return;
      }
      const baseName = data?.display_name || user.email?.split("@")[0] || "User";
      const nextHandle = normalizeHandle(baseName);
      setForm({
        display_name: baseName,
        handle: nextHandle,
        bio: "",
        tagline: "",
      });
      setReady(true);
    }
    go();
  }, [loading, user, router]);

  async function handleCreateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;
    setError(null);
    setSaving(true);
    const nextHandle = normalizeHandle(form.handle || form.display_name);
    if (!nextHandle) {
      setError("Please choose a handle.");
      setSaving(false);
      return;
    }
    const token = await safeGetAccessToken();
    if (!token) {
      setError("Please sign in again.");
      setSaving(false);
      return;
    }
    const res = await fetch("/api/profile/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        display_name: form.display_name,
        handle: nextHandle,
        bio: form.bio,
        tagline: form.tagline,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data?.handle) {
      setError(data?.error || "Could not create your profile. Try again.");
      setSaving(false);
      return;
    }
    router.push(`/profiles/${data.handle}`);
  }

  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center py-24">
        <div className="text-center max-w-md">
          {error ? (
            <p className="text-charcoal/70">{error}</p>
          ) : (
            <div className="w-8 h-8 border-2 border-charcoal/20 border-t-calm rounded-full animate-spin mx-auto" />
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center py-16">
      <div className="w-full max-w-lg rounded-3xl border border-charcoal/10 bg-white p-8 shadow-soft">
        <h1 className="font-display text-2xl text-charcoal">Create your profile</h1>
        <p className="text-charcoal/70 mt-2">Pick a display name and handle to finish setting up.</p>
        <form className="mt-6 grid gap-4" onSubmit={handleCreateProfile}>
          <label className="flex flex-col gap-2 text-sm text-charcoal/70">
            Display name
            <input
              className="rounded-lg border border-charcoal/15 bg-paper px-3 py-2 text-sm"
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-charcoal/70">
            Handle
            <input
              className="rounded-lg border border-charcoal/15 bg-paper px-3 py-2 text-sm"
              value={form.handle}
              onChange={(e) => setForm({ ...form, handle: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-charcoal/70">
            Tagline (optional)
            <input
              className="rounded-lg border border-charcoal/15 bg-paper px-3 py-2 text-sm"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-charcoal/70">
            Bio (optional)
            <textarea
              className="rounded-lg border border-charcoal/15 bg-paper px-3 py-2 text-sm min-h-[120px]"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </label>
          <div className="flex items-center gap-3">
            <button className="btn-primary text-sm" type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create profile"}
            </button>
            {error && <span className="text-sm text-urgency">{error}</span>}
          </div>
        </form>
      </div>
    </main>
  );
}
