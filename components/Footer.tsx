import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-charcoal/6 bg-paper mt-24">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16">
        <div className="rounded-3xl border border-charcoal/10 bg-white/80 p-8 sm:p-10 shadow-soft mb-12">
          <div className="lg:flex lg:items-center lg:justify-between gap-8">
            <div>
              <p className="text-meta uppercase tracking-[0.3em] text-charcoal/60">Write with clarity</p>
              <h3 className="font-display text-2xl text-charcoal font-semibold mt-3">
                Start your next story with care.
              </h3>
              <p className="mt-3 text-body text-charcoal/75 max-w-xl">
                The WriteWay is a calm space for youth voices in journalism and thoughtful discussion.
              </p>
            </div>
            <div className="mt-6 lg:mt-0 flex flex-wrap gap-3">
              <Link href="/submit" className="btn-primary">
                Submit a story
              </Link>
              <Link href="/feed" className="btn-secondary">
                Explore the feed
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16">
          <div className="md:col-span-6">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-6 group">
              <img
                src="/writeway-logo.svg"
                alt=""
                aria-hidden
                className="h-10 w-10 rounded-full border border-charcoal/10 shadow-sm"
              />
              <span className="font-display text-xl font-semibold text-charcoal block">The WriteWay</span>
            </Link>
            <p className="text-charcoal/75 text-body max-w-prose leading-relaxed">
              A platform for youth voices in journalism. We believe young people have important stories to tell with clarity, context, and care.
            </p>
          </div>

          <div className="md:col-span-3">
            <p className="text-meta text-charcoal-muted mb-4">Platform</p>
            <ul className="space-y-3">
              {[
                { href: "/about", label: "About" },
                { href: "/standards", label: "Standards" },
                { href: "/safety", label: "Safety" },
                { href: "/feed", label: "Feed" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-charcoal/75 hover:text-charcoal transition-colors text-body">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-3">
            <p className="text-meta text-charcoal-muted mb-4">Support</p>
            <ul className="space-y-3">
              {[
                { href: "/help", label: "Help" },
                { href: "/privacy", label: "Privacy" },
                { href: "/terms", label: "Terms" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-charcoal/75 hover:text-charcoal transition-colors text-body">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-charcoal/6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <p className="text-meta text-charcoal-muted">
            © {new Date().getFullYear()} The WriteWay. Built for young journalists.
          </p>
        </div>
      </div>
    </footer>
  );
}
