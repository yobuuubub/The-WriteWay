import Link from "next/link";

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-paper py-16">
      <div className="max-w-3xl mx-auto px-5 sm:px-8">
        <p className="text-meta text-charcoal/60">Support</p>
        <h1 className="font-display text-display-xl text-charcoal mt-3">Help Center</h1>
        <p className="text-body text-charcoal/75 mt-4">
          For account, publishing, or discussion support, contact The WriteWay team at
          {" "}
          <a className="text-calm hover:underline" href="mailto:support@thewriteway.org">
            support@thewriteway.org
          </a>
          .
        </p>
        <div className="mt-8 rounded-2xl border border-charcoal/10 bg-white p-6">
          <h2 className="font-display text-xl text-charcoal">Quick links</h2>
          <ul className="mt-4 space-y-2 text-charcoal/80">
            <li><Link className="hover:underline" href="/standards">Editorial standards</Link></li>
            <li><Link className="hover:underline" href="/safety">Safety and moderation</Link></li>
            <li><Link className="hover:underline" href="/privacy">Privacy policy</Link></li>
            <li><Link className="hover:underline" href="/terms">Terms of use</Link></li>
          </ul>
        </div>
      </div>
    </main>
  );
}
