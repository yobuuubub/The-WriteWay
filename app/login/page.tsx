"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("message");
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    async function checkExistingSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("Session check failed on login", error);
          return;
        }
        if (active && data.session?.user) router.push("/dashboard");
      } catch (err) {
        console.warn("Login session check error", err);
      }
    }
    void checkExistingSession();
    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        let msg = error.message;
        if (msg.includes("Invalid login credentials")) msg = "Invalid email or password.";
        if (msg.includes("Too many requests")) msg = "Too many attempts. Please wait a few minutes.";
        setError(msg);
      } else {
        router.push("/dashboard");
      }
    } catch {
      setLoading(false);
      setError("Network error. Please check your connection.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 right-10 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
        <div className="lg:grid lg:grid-cols-2 lg:gap-12 items-center">
          <section className="mb-12 lg:mb-0">
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Welcome back</p>
            <h1 className="mt-4 font-display text-4xl sm:text-5xl text-white font-semibold tracking-tight">
              Return to the studio
            </h1>
            <p className="mt-4 text-body-lg text-white/75 max-w-xl">
              Keep shaping your ideas with clarity and care. Your drafts, your discussions, your voice.
            </p>
            <div className="mt-8 space-y-4 text-sm text-white/70">
              {[
                "Drafts saved automatically and safely.",
                "Editorial guidance when you need it.",
                "A calm space for thoughtful publishing.",
              ].map((line) => (
                <div key={line} className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-amber-300" />
                  {line}
                </div>
              ))}
            </div>
          </section>

          <section className="w-full max-w-md">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
              <div className="text-center mb-8">
                <h2 className="font-display text-2xl text-white font-semibold">Sign in</h2>
                <p className="mt-2 text-sm text-white/60">Enter your credentials</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-xs uppercase tracking-[0.25em] text-white/50 mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoFocus
                    className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-300/40"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs uppercase tracking-[0.25em] text-white/50 mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-300/40"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-white text-slate-900 py-3 font-semibold transition hover:bg-white/90 disabled:opacity-50"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>

                {success && (
                  <div className="p-4 bg-emerald-400/10 border border-emerald-300/30 rounded-2xl" role="status">
                    <p className="text-emerald-100 text-sm">{success}</p>
                  </div>
                )}
                {error && (
                  <div className="p-4 bg-rose-400/10 border border-rose-300/30 rounded-2xl" role="alert">
                    <p className="text-rose-100 text-sm">{error}</p>
                  </div>
                )}
              </form>

              <p className="mt-6 text-center text-sm text-white/60">
                No account?{" "}
                <Link href="/signup" className="text-amber-200 hover:text-amber-100 transition-colors">
                  Sign up
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
