"use client";

import Link from "next/link";

export default function IssuesPage() {
  const categories = [
    "Account access",
    "Submission issues",
    "Discussion reports",
    "Editorial feedback",
    "Accessibility",
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 right-10 h-72 w-72 rounded-full bg-rose-400/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
        <header className="text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">Issues</p>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl font-semibold tracking-tight">Report an issue</h1>
          <p className="mt-4 text-body-lg text-white/70 max-w-2xl mx-auto">
            If you hit a problem with account access, submissions, or discussions, use the support channels below.
          </p>
        </header>

        <section className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
          <div className="lg:grid lg:grid-cols-12 lg:gap-10 items-center">
            <div className="lg:col-span-7">
              <h2 className="font-display text-2xl text-white font-semibold">Common topics</h2>
              <p className="mt-3 text-white/70">
                We can help quickly when your report includes steps to reproduce, affected page, and time of issue.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {categories.map((item) => (
                  <span key={item} className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/80">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="lg:col-span-5 mt-8 lg:mt-0">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Next step</p>
                <p className="mt-4 text-white/80">
                  For moderation concerns, use Safety. For technical issues, email support directly.
                </p>
                <a
                  href="mailto:support@thewriteway.org"
                  className="mt-4 inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  Email support
                </a>
                <Link
                  href="/safety"
                  className="mt-6 inline-flex items-center justify-center rounded-full bg-white text-slate-900 px-5 py-2 text-sm font-semibold transition hover:bg-white/90"
                >
                  Moderation and Safety
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
