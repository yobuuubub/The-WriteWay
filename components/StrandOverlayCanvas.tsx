"use client";

import { useEffect, useRef, useState } from "react";

type Strand = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  width: number;
  hue: number;
  trail: { x: number; y: number }[];
  flareAt: number;
};

export default function StrandOverlayCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scrollRef = useRef(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mql.matches);
    update();
    if (mql.addEventListener) mql.addEventListener("change", update);
    else mql.addListener(update);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", update);
      else mql.removeListener(update);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let strands: Strand[] = [];

    const palette = [182, 255, 20];

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      w = window.innerWidth * dpr;
      h = window.innerHeight * dpr;
      canvas.width = w;
      canvas.height = h;

      const count = reducedMotion ? 6 : 10;
      strands = [];
      for (let i = 0; i < count; i++) {
        const hue = palette[i % palette.length] + Math.random() * 8;
        const width = (1 + Math.random() * 2.8) * dpr;
        const x = Math.random() * w;
        const y = Math.random() * h;
        strands.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          speed: 0.3 + Math.random() * 0.5,
          width,
          hue,
          trail: Array.from({ length: 50 }, () => ({ x, y })),
          flareAt: performance.now() + 3000 + Math.random() * 6000,
        });
      }
    };

    const onScroll = () => {
      scrollRef.current = window.scrollY || 0;
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const time = now * 0.001;
      ctx.clearRect(0, 0, w, h);

      const scrollShift = scrollRef.current * 0.0002;
      const baseAlpha = reducedMotion ? 0.2 : 0.3;

      strands.forEach((strand, idx) => {
        const angle = Math.sin(time * 0.4 + idx) * 0.6 + Math.cos(time * 0.3 + idx * 2.1) * 0.4;
        const jitter = Math.sin(time * 0.6 + idx * 4.2 + scrollShift) * 0.2;
        strand.vx += Math.cos(angle) * 0.02 + jitter * 0.01;
        strand.vy += Math.sin(angle + jitter) * 0.02;

        strand.vx *= 0.98;
        strand.vy *= 0.98;
        strand.x += strand.vx * strand.speed * (reducedMotion ? 0.4 : 1);
        strand.y += strand.vy * strand.speed * (reducedMotion ? 0.4 : 1);

        if (strand.x < 0 || strand.x > w) strand.vx *= -1;
        if (strand.y < 0 || strand.y > h) strand.vy *= -1;

        strand.trail.unshift({ x: strand.x, y: strand.y });
        if (strand.trail.length > 70) strand.trail.pop();

        const inDarkZone = scrollRef.current + strand.y / dpr < window.innerHeight * 0.9;
        const surfaceFactor = inDarkZone ? 1.15 : 0.65;
        const flare = now > strand.flareAt && now - strand.flareAt < 1000 ? 0.22 : 0;
        if (now - strand.flareAt > 1400) strand.flareAt = now + 4000 + Math.random() * 6000;

        ctx.save();
        ctx.globalAlpha = (baseAlpha + flare) * surfaceFactor;
        ctx.lineWidth = strand.width;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        const gradient = ctx.createLinearGradient(strand.trail[strand.trail.length - 1].x, strand.trail[strand.trail.length - 1].y, strand.x, strand.y);
        gradient.addColorStop(0, `hsla(${strand.hue}, 80%, 70%, 0)`);
        gradient.addColorStop(0.6, `hsla(${strand.hue}, 85%, 70%, 0.6)`);
        gradient.addColorStop(1, `hsla(${strand.hue}, 85%, 72%, 0.9)`);
        ctx.strokeStyle = gradient;
        ctx.shadowBlur = 16;
        ctx.shadowColor = `hsla(${strand.hue}, 85%, 70%, 0.45)`;
        ctx.beginPath();
        strand.trail.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        ctx.restore();
      });
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [reducedMotion]);

  return <canvas ref={canvasRef} className="strand-overlay" aria-hidden />;
}
