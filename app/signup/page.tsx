"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    let active = true;
    async function checkExistingSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("Session check failed on signup", error);
          return;
        }
        if (active && data.session?.user) router.push("/dashboard");
      } catch (err) {
        console.warn("Signup session check error", err);
      }
    }
    void checkExistingSession();
    return () => {
      active = false;
    };
  }, [router]);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Signup failed");
      setSuccess(true);
      setSuccessMessage(data.message);
      setTimeout(() => router.push("/login?message=" + encodeURIComponent(data.message)), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 right-10 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
        <div className="lg:grid lg:grid-cols-2 lg:gap-12 items-center">
          <section className="mb-12 lg:mb-0">
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Join the studio</p>
            <h1 className="mt-4 font-display text-4xl sm:text-5xl text-white font-semibold tracking-tight">
              Build your writing ritual
            </h1>
            <p className="mt-4 text-body-lg text-white/75 max-w-xl">
              Create a calm space for your reporting, reflections, and letters. We will guide each draft toward clarity.
            </p>
            <div className="mt-8 space-y-4 text-sm text-white/70">
              {[
                "Save drafts, track review, publish when ready.",
                "Thoughtful discussions with daily limits.",
                "Editorial support without engagement noise.",
              ].map((line) => (
                <div key={line} className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  {line}
                </div>
              ))}
            </div>
          </section>

          <section className="w-full max-w-md">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
              <div className="text-center mb-8">
                <h2 className="font-display text-2xl text-white font-semibold">Create account</h2>
                <p className="mt-2 text-sm text-white/60">Start your first draft</p>
              </div>

              <form onSubmit={handleSignUp} className="space-y-6">
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
                    className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
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
                    className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-xs uppercase tracking-[0.25em] text-white/50 mb-2">
                    Confirm password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-white text-slate-900 py-3 font-semibold transition hover:bg-white/90 disabled:opacity-50"
                >
                  {loading ? "Creating account..." : "Create account"}
                </button>

                {success && (
                  <div className="p-4 bg-emerald-400/10 border border-emerald-300/30 rounded-2xl" role="status">
                    <p className="text-emerald-100 text-sm">{successMessage}</p>
                  </div>
                )}
                {error && (
                  <div className="p-4 bg-rose-400/10 border border-rose-300/30 rounded-2xl" role="alert">
                    <p className="text-rose-100 text-sm">{error}</p>
                  </div>
                )}
              </form>

              <p className="mt-6 text-center text-sm text-white/60">
                Already have an account?{" "}
                <Link href="/login" className="text-emerald-200 hover:text-emerald-100 transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
