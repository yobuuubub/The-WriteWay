import { Suspense } from "react";
import SubmitPageClient from "./SubmitPageClient";

function SubmitFallback() {
  return (
    <main className="min-h-screen bg-paper flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-charcoal/20 border-t-calm rounded-full animate-spin" />
    </main>
  );
}

export default function SubmitPage() {
  return (
    <Suspense fallback={<SubmitFallback />}>
      <SubmitPageClient />
    </Suspense>
  );
}
