export default function TermsPage() {
  return (
    <main className="min-h-screen bg-paper py-16">
      <div className="max-w-3xl mx-auto px-5 sm:px-8">
        <p className="text-meta text-charcoal/60">Legal</p>
        <h1 className="font-display text-display-xl text-charcoal mt-3">Terms of Use</h1>
        <div className="mt-6 space-y-5 text-charcoal/80">
          <p>
            By using The WriteWay, you agree to follow our editorial standards and safety rules for respectful,
            non-harmful participation.
          </p>
          <p>
            You are responsible for the content you publish. The WriteWay may remove or restrict content that violates
            policy or applicable law.
          </p>
          <p>
            For questions about these terms, contact
            {" "}
            <a className="text-calm hover:underline" href="mailto:legal@thewriteway.org">
              legal@thewriteway.org
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
