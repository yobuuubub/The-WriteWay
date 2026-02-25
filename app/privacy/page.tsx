export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-paper py-16">
      <div className="max-w-3xl mx-auto px-5 sm:px-8">
        <p className="text-meta text-charcoal/60">Legal</p>
        <h1 className="font-display text-display-xl text-charcoal mt-3">Privacy Policy</h1>
        <div className="mt-6 space-y-5 text-charcoal/80">
          <p>
            The WriteWay collects account details, published content, discussion posts, and moderation metadata needed
            to operate the platform safely.
          </p>
          <p>
            We do not sell personal data. Access to operational data is limited to authorized maintainers and audited
            infrastructure providers.
          </p>
          <p>
            To request data deletion or export, contact
            {" "}
            <a className="text-calm hover:underline" href="mailto:privacy@thewriteway.org">
              privacy@thewriteway.org
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
