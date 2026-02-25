"use client";

import Link from "next/link";

export default function AboutPage() {
  const values = [
    {
      title: "Editorial quality",
      text: "Every article goes through review before publication. Care is part of the craft.",
    },
    {
      title: "Thoughtful discussion",
      text: "Daily limits keep conversations slow, considered, and meaningful.",
    },
    {
      title: "No engagement metrics",
      text: "No likes or leaderboards. We prioritize clarity over noise.",
    },
    {
      title: "AI-assisted moderation",
      text: "AI flags content, but humans make the decisions that matter.",
    },
  ];

  return (
    <main className="min-h-screen bg-paper text-charcoal">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 right-0 h-72 w-72 rounded-full bg-hope/20 blur-3xl" />
          <div className="absolute top-32 -left-12 h-64 w-64 rounded-full bg-calm/15 blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24 relative">
          <p className="text-meta uppercase tracking-[0.3em] text-charcoal/60">About The WriteWay</p>
          <h1 className="font-display text-display-2xl sm:text-display-3xl text-charcoal font-semibold tracking-tight mt-4">
            A studio for young journalists
          </h1>
          <p className="mt-5 text-body-lg text-charcoal/80 max-w-2xl leading-relaxed">
            The WriteWay is a calm, serious platform for youth voices in journalism, reporting, and thoughtful
            discussion. We build room for care, context, and clarity.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3 max-w-3xl">
            {[
              { label: "Editorial review", value: "Human-led" },
              { label: "Daily post limit", value: "2 responses" },
              { label: "Focus", value: "Quality over quantity" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-charcoal/10 bg-white/70 p-4 shadow-soft">
                <p className="text-meta text-charcoal/60">{item.label}</p>
                <p className="mt-2 font-display text-lg text-charcoal">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-20 sm:pb-28">
        <div className="lg:grid lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7 space-y-12">
            <div className="rounded-3xl border border-charcoal/10 bg-white/80 p-8 sm:p-10 shadow-soft">
              <h2 className="font-display text-display text-charcoal font-semibold mb-4">Our mission</h2>
              <p className="text-body-lg text-charcoal/85 leading-relaxed">
                We believe young people have unique perspectives that deserve a dedicated space free from
                engagement metrics. The WriteWay is built for depth, not speed.
              </p>
            </div>

            <div className="rounded-3xl border border-charcoal/10 bg-white/80 p-8 sm:p-10 shadow-soft">
              <h2 className="font-display text-display text-charcoal font-semibold mb-4">What we do</h2>
              <p className="text-body-lg text-charcoal/85 leading-relaxed mb-6">
                We publish reporting, analysis, voices, and letters written by youth. Our editorial process
                ensures quality while preserving each writer's voice.
              </p>
              <p className="text-body-lg text-charcoal/85 leading-relaxed">
                Each article includes a guided discussion space designed for reflection, not performance.
              </p>
            </div>

            <div className="rounded-3xl border border-charcoal/10 bg-white/80 p-8 sm:p-10 shadow-soft">
              <h2 className="font-display text-display text-charcoal font-semibold mb-6">Our values</h2>
              <div className="space-y-5">
                {values.map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <span className="text-accent font-display">-</span>
                    <div>
                      <p className="font-semibold text-charcoal">{item.title}</p>
                      <p className="text-body text-charcoal/80">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="lg:col-span-5 mt-12 lg:mt-0 space-y-6">
            <div className="rounded-3xl border border-charcoal/10 bg-paper-warm p-8 shadow-soft">
              <p className="text-meta uppercase tracking-[0.3em] text-charcoal/60">Studio principles</p>
              <h3 className="font-display text-2xl text-charcoal font-semibold mt-3">Clarity. Context. Care.</h3>
              <p className="mt-4 text-body text-charcoal/80">
                Every feature is shaped around these three words. If it does not support them, it does not ship.
              </p>
              <div className="mt-6 space-y-3 text-body text-charcoal/75">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-hope" />
                  Calm interfaces that reduce noise.
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-calm" />
                  Intentional prompts to guide reflection.
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-emotion" />
                  Editorial care at every step.
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-charcoal/10 bg-white/90 p-8 shadow-soft">
              <h3 className="font-display text-xl text-charcoal font-semibold">Contact</h3>
              <p className="mt-3 text-body text-charcoal/80">
                Review our standards and safety policies to learn how we operate.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/standards" className="btn-secondary">
                  Standards
                </Link>
                <Link href="/safety" className="btn-primary">
                  Safety
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
