"use client";

export default function StandardsPage() {
  const sections = [
    {
      title: "Article submission",
      items: [
        { label: "Article types", text: "We accept Reporting, Analysis, Voices, and Letters." },
        { label: "Editorial review", text: "All submissions go through editorial review after submission." },
        { label: "Disclosures", text: "Authors must disclose conflicts of interest or relevant background." },
        { label: "Context box", text: "Provide context to help readers understand the article when relevant." },
      ],
    },
    {
      title: "Discussion standards",
      items: [
        { label: "Daily limits", text: "Users may post up to 2 responses per day." },
        { label: "Word limits", text: "Each post must be 300 words or less." },
        { label: "Quality over quantity", text: "These limits encourage thoughtful contributions." },
        { label: "Chronological order", text: "Posts are displayed in order without algorithmic ranking." },
      ],
    },
    {
      title: "Behavior",
      items: [
        { label: "Respectful discourse", text: "All participants must engage respectfully." },
        { label: "No harassment", text: "Harassment, hate speech, or personal attacks will not be tolerated." },
        { label: "Moderation", text: "AI-assisted moderation flags content for human review." },
        { label: "Appeals", text: "Users may appeal moderation decisions." },
      ],
    },
    {
      title: "AI review",
      items: [
        { label: "Automated standards", text: "Submissions undergo AI analysis for safety, clarity, and compliance." },
        { label: "Lifecycle", text: "Draft -> AI Review -> Approved / Rejected / Needs Revision -> Published." },
        { label: "Human oversight", text: "AI is a standards verifier, not an editor or fact authority." },
        { label: "Author rights", text: "Authors can revise and resubmit articles that need changes." },
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-paper">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 right-0 h-72 w-72 rounded-full bg-calm/20 blur-3xl" />
          <div className="absolute top-32 -left-16 h-64 w-64 rounded-full bg-hope/20 blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24 relative">
          <p className="text-meta uppercase tracking-[0.3em] text-charcoal/60">Standards</p>
          <h1 className="font-display text-display-2xl sm:text-display-3xl text-charcoal font-semibold tracking-tight mt-4">
            Editorial standards
          </h1>
          <p className="mt-4 text-body-lg text-charcoal/80 max-w-2xl leading-relaxed">
            Clear rules protect writers, readers, and the integrity of every story. These standards are the
            quiet scaffolding behind the work.
          </p>

          <div className="mt-12 lg:grid lg:grid-cols-12 lg:gap-10">
            <aside className="lg:col-span-4">
              <div className="lg:sticky lg:top-24 rounded-3xl border border-charcoal/10 bg-white/80 p-6 shadow-soft">
                <p className="text-meta text-charcoal/60 mb-4">Sections</p>
                <div className="space-y-3">
                  {sections.map((section) => (
                    <a
                      key={section.title}
                      href={`#${section.title.toLowerCase().replace(/\s+/g, "-")}`}
                      className="block rounded-2xl border border-charcoal/10 bg-paper/70 px-4 py-3 text-charcoal/80 hover:text-charcoal hover:border-charcoal/20 transition"
                    >
                      {section.title}
                    </a>
                  ))}
                </div>
              </div>
            </aside>

            <div className="lg:col-span-8 mt-10 lg:mt-0 space-y-8">
              {sections.map((section) => (
                <section
                  key={section.title}
                  id={section.title.toLowerCase().replace(/\s+/g, "-")}
                  className="rounded-3xl border border-charcoal/10 bg-white/90 p-8 sm:p-10 shadow-soft"
                >
                  <h2 className="font-display text-display text-charcoal font-semibold mb-6">
                    {section.title}
                  </h2>
                  <div className="space-y-5">
                    {section.items.map((item) => (
                      <div key={item.label} className="flex gap-4">
                        <span className="h-2 w-2 mt-2 rounded-full bg-accent" />
                        <div>
                          <p className="font-semibold text-charcoal">{item.label}</p>
                          <p className="text-body text-charcoal/80">{item.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
