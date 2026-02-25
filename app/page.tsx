"use client";

import { useEffect } from "react";
import Link from "next/link";
import ParticleGlobeCanvas from "../components/ParticleGlobeCanvas";
import IdeaLifecycleTimeline from "../components/home/IdeaLifecycleTimeline";

export default function HomePage() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll("[data-animate]"));
    if (!elements.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="homepage-root" style={{ minHeight: "100vh", position: "relative" }}>
      <section id="world" className="hero-section">
        <ParticleGlobeCanvas className="hero-globe-canvas" />

        <div className="max-container hero-grid">
          <div className="hero-copy">
            <p className="hero-eyebrow reveal" data-animate>The WriteWay</p>
            <h1 className="display reveal" data-animate style={{ color: "white", margin: 0, maxWidth: "12ch", lineHeight: 0.95, letterSpacing: "-0.02em" }}>
              Stories with
              <br />
              <span className="accent-highlight">backbone</span>
              <br />
              and voice
            </h1>
            <p className="hero-subhead reveal" data-animate>
              A serious publishing space for young journalists. Report deeply, write clearly, and publish work that lasts.
            </p>
            <div className="hero-ctas reveal" data-animate>
              <Link
                href="/feed"
                className="hero-btn hero-btn-primary"
              >
                Explore the feed
              </Link>
              <Link
                href="/submit"
                className="hero-btn hero-btn-secondary"
              >
                Submit a story
              </Link>
            </div>
          </div>
          <div className="hero-globe-spacer" aria-hidden />
        </div>
      </section>

      <IdeaLifecycleTimeline />
    </main>
  );
}
