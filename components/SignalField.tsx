"use client";

import { useEffect, useRef, useState } from "react";

type SignalFieldProps = {
  className?: string;
  activeIndex?: number | null;
};

type DotEvent = {
  y: number;
  bornAt: number;
  duration: number;
  xOffset: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export default function SignalField({ className, activeIndex }: SignalFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const lastActiveIndex = useRef<number | null>(null);
  const lastDotAt = useRef(0);

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
    let seed = Math.random() * 1000;
    let phase = Math.random() * Math.PI * 2;
    let drift = 0;
    let dotEvents: DotEvent[] = [];
    let lastAutoDot = performance.now();

    const palette = [
      { r: 86, g: 164, b: 190 },
      { r: 110, g: 190, b: 170 },
      { r: 170, g: 210, b: 230 },
    ];

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      w = canvas.clientWidth * dpr;
      h = canvas.clientHeight * dpr;
      canvas.width = w;
      canvas.height = h;
    };

    const noise = (t: number) => {
      // Smooth pseudo-noise without external libs
      return Math.sin(t * 0.9 + seed) * 0.6 + Math.sin(t * 0.27 + seed * 1.3) * 0.4;
    };

    const addDot = (y: number, now: number, xOffset: number) => {
      dotEvents.push({
        y: clamp(y, 0.08, 0.92),
        bornAt: now,
        duration: 1400,
        xOffset,
      });
      if (dotEvents.length > 8) dotEvents.shift();
    };

    const buildPath = (now: number) => {
      const points: { x: number; y: number; w: number }[] = [];
      const columns = 7;
      const left = w * 0.18;
      const right = w * 0.82;
      const baseX = (left + right) / 2;
      const amplitude = (right - left) * 0.22;
      const step = h / (columns * 6);
      const t = now * 0.00008 + seed;
      const hoverTarget = activeIndex !== null ? clamp((activeIndex + 0.6) / 6, 0.1, 0.9) : null;

      for (let i = 0; i <= columns * 6; i++) {
        const y = i * step;
        const ny = y / h;
        const slow = noise(t + ny * 2.4 + phase) * 0.5;
        const slow2 = Math.sin(t * 0.7 + ny * 1.2 + phase) * 0.5;
        let bend = slow + slow2;
        if (hoverTarget !== null) {
          const dist = Math.abs(ny - hoverTarget);
          const influence = Math.exp(-dist * 8);
          const pull = (hoverTarget - ny) * 0.5;
          bend += pull * influence;
        }
        const x = baseX + bend * amplitude;
        const thickness = 1 + (Math.sin(ny * 3.2 + t * 2.2) + 1) * 0.6;
        points.push({ x, y, w: clamp(thickness, 1, 3) });
      }
      return points;
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, w, h);

      if (!reducedMotion) {
        drift += 0.0006;
      }

      const points = buildPath(now + drift * 1000);

      // Main worldline
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const color = palette[i % palette.length];
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.28)`;
        ctx.lineWidth = (prev.w + curr.w) * 0.5;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.stroke();
      }
      ctx.restore();

      if (!reducedMotion && now - lastAutoDot > 4200 + Math.random() * 2400) {
        const idx = Math.floor(Math.random() * points.length);
        const p = points[idx];
        addDot(p.y / h, now, (p.x - w * 0.5) / w);
        lastAutoDot = now;
      }

      if (activeIndex !== null) {
        const shouldTrigger = lastActiveIndex.current !== activeIndex || now - lastDotAt.current > 1800;
        if (shouldTrigger) {
          const targetY = clamp((activeIndex + 0.6) / 6, 0.1, 0.9);
          const nearest = points.reduce((best, p) => {
            const dy = Math.abs(p.y / h - targetY);
            return dy < best.d ? { p, d: dy } : best;
          }, { p: points[0], d: 10 });
          addDot(targetY, now, (nearest.p.x - w * 0.5) / w);
          lastActiveIndex.current = activeIndex;
          lastDotAt.current = now;
        }
      } else {
        lastActiveIndex.current = null;
      }

      // Branches (subtle)
      if (!reducedMotion) {
        for (let i = 0; i < points.length; i += 16) {
          const p = points[i];
          if (!p) continue;
          const jitter = Math.sin(i + now * 0.0003) * 0.4;
          const bx = p.x + (w * 0.05 + jitter) * Math.sin(i);
          const by = p.y + h * 0.03 * Math.cos(i * 0.3);
          ctx.strokeStyle = "rgba(120,170,190,0.18)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.quadraticCurveTo((p.x + bx) / 2, (p.y + by) / 2, p.x, p.y + h * 0.02);
          ctx.stroke();
        }
      }

      // Dot events
      dotEvents = dotEvents.filter((dot) => now - dot.bornAt < dot.duration);
      dotEvents.forEach((dot, idx) => {
        const elapsed = now - dot.bornAt;
        const progress = clamp(elapsed / dot.duration, 0, 1);
        const pulse = Math.sin(progress * Math.PI);
        const y = dot.y * h;
        const idxColor = palette[idx % palette.length];
        const xShift = dot.xOffset * w * 0.12;
        const point = points.reduce((best, p) => {
          const dy = Math.abs(p.y - y);
          return dy < best.d ? { p, d: dy } : best;
        }, { p: points[0], d: 10 });
        const x = point.p.x + xShift;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${idxColor.r}, ${idxColor.g}, ${idxColor.b}, ${0.35 * pulse})`;
        ctx.arc(x, y, 2.2 + pulse * 2, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [reducedMotion, activeIndex]);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
