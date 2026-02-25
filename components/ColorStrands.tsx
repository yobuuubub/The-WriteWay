"use client";

import { useEffect, useRef } from "react";

export default function ColorStrands() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        root.style.setProperty("--strand-shift", `${y * 0.05}px`);
        raf = 0;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={rootRef} className="color-strands" aria-hidden>
      <svg viewBox="0 0 1200 2600" preserveAspectRatio="none">
        <defs>
          <linearGradient id="strand-teal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--strand-teal)" stopOpacity="0.25" />
            <stop offset="0.5" stopColor="var(--strand-teal)" stopOpacity="0.5" />
            <stop offset="1" stopColor="var(--strand-teal)" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="strand-violet" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--strand-violet)" stopOpacity="0.18" />
            <stop offset="0.55" stopColor="var(--strand-violet)" stopOpacity="0.45" />
            <stop offset="1" stopColor="var(--strand-violet)" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="strand-coral" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="var(--strand-coral)" stopOpacity="0.18" />
            <stop offset="0.4" stopColor="var(--strand-coral)" stopOpacity="0.4" />
            <stop offset="1" stopColor="var(--strand-coral)" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        <g className="strand-group">
          <path
            className="strand strand-base"
            d="M160,100 C280,280 200,520 360,760 C540,1040 220,1280 420,1500 C640,1740 520,2080 320,2500"
            stroke="url(#strand-teal)"
          />
          <path
            className="strand strand-base"
            d="M980,80 C760,360 980,520 820,860 C620,1280 980,1460 760,1820 C620,2080 720,2320 880,2540"
            stroke="url(#strand-violet)"
          />
          <path
            className="strand strand-base"
            d="M620,140 C540,340 740,560 640,820 C520,1180 700,1340 600,1660 C500,1980 660,2260 560,2520"
            stroke="url(#strand-coral)"
          />

          <path
            className="strand strand-shimmer"
            d="M160,100 C280,280 200,520 360,760 C540,1040 220,1280 420,1500 C640,1740 520,2080 320,2500"
            stroke="url(#strand-teal)"
          />
          <path
            className="strand strand-shimmer"
            d="M980,80 C760,360 980,520 820,860 C620,1280 980,1460 760,1820 C620,2080 720,2320 880,2540"
            stroke="url(#strand-violet)"
          />
          <path
            className="strand strand-shimmer"
            d="M620,140 C540,340 740,560 640,820 C520,1180 700,1340 600,1660 C500,1980 660,2260 560,2520"
            stroke="url(#strand-coral)"
          />
        </g>
      </svg>
    </div>
  );
}
