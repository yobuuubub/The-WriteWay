"use client";

import Link from "next/link";

export default function SafetyPage() {
  const flags = [
    "Harassment or personal attacks",
    "Hate speech or discriminatory language",
    "Spam or low-quality content",
    "Potentially inflammatory language",
  ];

  const steps = [
    { title: "Signal", text: "AI scans submissions for safety and clarity risks." },
    { title: "Review", text: "Human moderators review every flag before action." },
    { title: "Resolve", text: "Authors receive feedback and can revise when needed." },
    { title: "Archive", text: "All decisions are logged for accountability." },
  ];

  return (
    <main className="min-h-screen bg-paper text-charcoal">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 right-10 h-72 w-72 rounded-full bg-hope/20 blur-3xl" />
          <div className="absolute top-40 -left-20 h-64 w-64 rounded-full bg-emotion/15 blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24 relative">
          <p className="text-meta uppercase tracking-[0.3em] text-charcoal/60">Safety</p>
          <h1 className="font-display text-display-2xl sm:text-display-3xl text-charcoal font-semibold tracking-tight mt-4">
            Safety and moderation
          </h1>
          <p className="mt-4 text-body-lg text-charcoal/80 max-w-2xl leading-relaxed">
            We use AI-assisted moderation to surface potential risks, but humans make every final decision.
            Safety is about care, not punishment.
          </p>

          <div className="mt-12 lg:grid lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-7 space-y-8">
              <section className="rounded-3xl border border-charcoal/10 bg-white/90 p-8 sm:p-10 shadow-soft">
                <h2 className="font-display text-display text-charcoal font-semibold mb-4">Our approach</h2>
                <p className="text-body-lg text-charcoal/85 leading-relaxed mb-6">
                  The WriteWay uses AI-assisted moderation to help identify potentially problematic content,
                  but humans make all final decisions. We never automatically delete content based on AI flags alone.
                </p>
                <p className="text-body-lg text-charcoal/85 leading-relaxed">
                  Every moderation action is reviewed by a human moderator.
                </p>
              </section>

              <section className="rounded-3xl border border-charcoal/10 bg-white/90 p-8 sm:p-10 shadow-soft">
                <h2 className="font-display text-display text-charcoal font-semibold mb-4">What gets flagged</h2>
                <p className="text-body text-charcoal/80 mb-6">AI flags content that may contain:</p>
                <div className="flex flex-wrap gap-3">
                  {flags.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-charcoal/10 bg-paper/80 px-4 py-2 text-body text-charcoal/80"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <p className="mt-6 text-body text-charcoal/80">
                  Flagged content is reviewed by moderators before any action.
                </p>
              </section>
            </div>

            <aside className="lg:col-span-5 mt-10 lg:mt-0 space-y-6">
              <div className="rounded-3xl border border-charcoal/10 bg-paper-warm p-8 shadow-soft">
                <p className="text-meta uppercase tracking-[0.3em] text-charcoal/60">Safety flow</p>
                <div className="mt-6 space-y-4">
                  {steps.map((step, index) => (
                    <div key={step.title} className="rounded-2xl border border-charcoal/10 bg-white/80 p-4">
                      <div className="flex items-center gap-3">
                        <span className="h-8 w-8 rounded-full bg-accent text-white flex items-center justify-center text-sm font-semibold">
                          0{index + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-charcoal">{step.title}</p>
                          <p className="text-body text-charcoal/75">{step.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-charcoal/10 bg-white/90 p-8 shadow-soft">
                <h3 className="font-display text-xl text-charcoal font-semibold">Need help?</h3>
                <p className="mt-3 text-body text-charcoal/80">
                  For reporting issues or concerns, review our standards or contact our team.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/standards" className="btn-secondary">
                    Standards
                  </Link>
                  <Link href="/help" className="btn-primary">
                    Contact
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
