"use client";

import { useEffect, useRef, useState } from "react";

type WorldAtmosphereCanvasProps = {
  className?: string;
  highlightIndex?: number | null;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  lum: number;
  hue: number;
  seed: number;
};

type Ripple = {
  x: number;
  y: number;
  startAt: number;
  maxR: number;
};

type Streak = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  startAt: number;
  duration: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function drawMapMask(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "white";

  ctx.beginPath();
  ctx.moveTo(w * 0.12, h * 0.24);
  ctx.bezierCurveTo(w * 0.18, h * 0.05, w * 0.34, h * 0.08, w * 0.38, h * 0.22);
  ctx.bezierCurveTo(w * 0.42, h * 0.28, w * 0.4, h * 0.48, w * 0.24, h * 0.5);
  ctx.bezierCurveTo(w * 0.14, h * 0.52, w * 0.08, h * 0.38, w * 0.12, h * 0.24);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(w * 0.3, h * 0.54);
  ctx.bezierCurveTo(w * 0.38, h * 0.54, w * 0.4, h * 0.68, w * 0.34, h * 0.84);
  ctx.bezierCurveTo(w * 0.26, h * 0.92, w * 0.2, h * 0.82, w * 0.2, h * 0.66);
  ctx.bezierCurveTo(w * 0.22, h * 0.58, w * 0.24, h * 0.56, w * 0.3, h * 0.54);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(w * 0.42, h * 0.2);
  ctx.bezierCurveTo(w * 0.5, h * 0.05, w * 0.78, h * 0.08, w * 0.88, h * 0.24);
  ctx.bezierCurveTo(w * 0.94, h * 0.36, w * 0.86, h * 0.52, w * 0.66, h * 0.5);
  ctx.bezierCurveTo(w * 0.58, h * 0.5, w * 0.54, h * 0.44, w * 0.48, h * 0.42);
  ctx.bezierCurveTo(w * 0.42, h * 0.38, w * 0.4, h * 0.3, w * 0.42, h * 0.2);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(w * 0.52, h * 0.46);
  ctx.bezierCurveTo(w * 0.62, h * 0.46, w * 0.7, h * 0.62, w * 0.62, h * 0.78);
  ctx.bezierCurveTo(w * 0.56, h * 0.9, w * 0.46, h * 0.8, w * 0.48, h * 0.64);
  ctx.bezierCurveTo(w * 0.5, h * 0.54, w * 0.5, h * 0.48, w * 0.52, h * 0.46);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(w * 0.78, h * 0.68);
  ctx.bezierCurveTo(w * 0.86, h * 0.66, w * 0.9, h * 0.78, w * 0.84, h * 0.88);
  ctx.bezierCurveTo(w * 0.76, h * 0.92, w * 0.7, h * 0.84, w * 0.72, h * 0.74);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(w * 0.32, h * 0.08, w * 0.06, h * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();
}

export default function WorldAtmosphereCanvas({ className, highlightIndex }: WorldAtmosphereCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const highlightRef = useRef<number | null>(null);
  const pointerRef = useRef({ x: 0, y: 0, lastX: 0, lastY: 0, active: false, down: false });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    highlightRef.current = highlightIndex ?? null;
  }, [highlightIndex]);

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
    let centerX = 0;
    let centerY = 0;
    let fieldW = 0;
    let fieldH = 0;
    let fieldX = 0;
    let fieldY = 0;
    let particles: Particle[] = [];
    let ripples: Ripple[] = [];
    let streaks: Streak[] = [];
    let nextStreakAt = performance.now() + 2400;
    const clusterCount = 6;
    let clusters: { x: number; y: number }[] = [];

    const palette = [188, 214, 26];

    const maskCanvas = document.createElement("canvas");
    const maskCtx = maskCanvas.getContext("2d");
    let maskData: Uint8ClampedArray | null = null;
    let maskW = 0;
    let maskH = 0;

    const inMask = (x: number, y: number) => {
      if (!maskData) return true;
      const mx = Math.floor(((x - fieldX) / fieldW) * maskW);
      const my = Math.floor(((y - fieldY) / fieldH) * maskH);
      if (mx < 0 || my < 0 || mx >= maskW || my >= maskH) return false;
      return maskData[(my * maskW + mx) * 4 + 3] > 10;
    };

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      w = canvas.clientWidth * dpr;
      h = canvas.clientHeight * dpr;
      canvas.width = w;
      canvas.height = h;
      centerX = w * 0.62;
      centerY = h * 0.52;
      fieldH = h * 0.72;
      fieldW = fieldH * 1.55;
      fieldX = centerX - fieldW / 2;
      fieldY = centerY - fieldH / 2;

      maskW = 360;
      maskH = 180;
      maskCanvas.width = maskW;
      maskCanvas.height = maskH;
      if (maskCtx) {
        drawMapMask(maskCtx, maskW, maskH);
        maskData = maskCtx.getImageData(0, 0, maskW, maskH).data;
      }

      const countBase = reducedMotion ? 420 : 860;
      const targetCount = clamp(Math.round((fieldW * fieldH) / 14000), 380, countBase);
      particles = [];
      for (let i = 0; i < targetCount; i++) {
        let px = 0;
        let py = 0;
        let tries = 0;
        while (tries < 40) {
          const rx = Math.random();
          const ry = Math.random();
          const mx = Math.floor(rx * maskW);
          const my = Math.floor(ry * maskH);
          if (maskData && maskData[(my * maskW + mx) * 4 + 3] > 10) {
            px = fieldX + rx * fieldW;
            py = fieldY + ry * fieldH;
            break;
          }
          tries += 1;
        }
        particles.push({
          x: px || fieldX + Math.random() * fieldW,
          y: py || fieldY + Math.random() * fieldH,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          size: (0.7 + Math.random() * 1.5) * dpr,
          lum: 0.5 + Math.random() * 0.45,
          hue: palette[i % palette.length] + Math.random() * 8,
          seed: Math.random() * 1000,
        });
      }

      clusters = Array.from({ length: clusterCount }, (_, idx) => ({
        x: fieldX + fieldW * (0.2 + 0.15 * idx) + Math.sin(idx) * fieldW * 0.06,
        y: fieldY + fieldH * (0.3 + 0.08 * idx) + Math.cos(idx) * fieldH * 0.08,
      }));
    };

    const pointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) * dpr;
      const y = (event.clientY - rect.top) * dpr;
      pointerRef.current.active = x >= 0 && y >= 0 && x <= w && y <= h;
      if (!pointerRef.current.active) return;
      pointerRef.current.lastX = pointerRef.current.x || x;
      pointerRef.current.lastY = pointerRef.current.y || y;
      pointerRef.current.x = x;
      pointerRef.current.y = y;
    };

    const pointerDown = (event: PointerEvent) => {
      pointerMove(event);
      pointerRef.current.down = true;
      if (!reducedMotion) {
        ripples.push({ x: pointerRef.current.x, y: pointerRef.current.y, startAt: performance.now(), maxR: Math.max(w, h) * 0.5 });
      }
    };

    const pointerUp = () => {
      pointerRef.current.down = false;
    };

    const flowField = (x: number, y: number, t: number) => {
      const nx = (x - centerX) * 0.002;
      const ny = (y - centerY) * 0.0024;
      return Math.sin(nx * 2.1 + t * 0.6) + Math.cos(ny * 2.4 - t * 0.5);
    };

    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("pointermove", pointerMove, { passive: true });
    canvas.addEventListener("pointerdown", pointerDown, { passive: true });
    window.addEventListener("pointerup", pointerUp);
    window.addEventListener("pointercancel", pointerUp);

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const time = now * 0.001;
      const motionScale = reducedMotion ? 0.18 : 1;
      const breath = 1 + Math.sin(time * Math.PI * 2 / 8.8) * (reducedMotion ? 0.01 : 0.04);

      ctx.clearRect(0, 0, w, h);

      // soft constellation wash
      const wash = ctx.createRadialGradient(centerX, centerY, fieldH * 0.2, centerX, centerY, fieldH * 0.9);
      wash.addColorStop(0, "rgba(24,68,92,0.6)");
      wash.addColorStop(0.5, "rgba(5,18,36,0.85)");
      wash.addColorStop(1, "rgba(2,3,8,0.95)");
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, w, h);

      if (maskCtx) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 0.12;
        ctx.drawImage(maskCanvas, fieldX, fieldY, fieldW, fieldH);
        ctx.restore();
      }

      if (!reducedMotion && now > nextStreakAt) {
        streaks.push({
          x: fieldX + Math.random() * fieldW,
          y: fieldY + Math.random() * fieldH,
          vx: (Math.random() - 0.5) * 2.6,
          vy: -1.4 - Math.random() * 1.4,
          startAt: now,
          duration: 900 + Math.random() * 900,
        });
        nextStreakAt = now + 2400 + Math.random() * 4200;
      }

      ripples = ripples.filter((ripple) => now - ripple.startAt < 1800);

      const dragDx = pointerRef.current.x - pointerRef.current.lastX;
      const dragDy = pointerRef.current.y - pointerRef.current.lastY;
      const dragActive = pointerRef.current.down && pointerRef.current.active && !reducedMotion;
      const influenceR = fieldH * 0.35;

      const highlightCluster = highlightRef.current === null ? null : highlightRef.current % clusterCount;

      particles.forEach((p) => {
        const flow = flowField(p.x, p.y, time);
        const swirl = Math.sin((p.x + p.y) * 0.002 + time * 0.6 + p.seed) * 0.4;
        p.vx += (Math.cos(flow) * 0.04 + swirl * 0.02) * breath * motionScale;
        p.vy += (Math.sin(flow) * 0.04 - swirl * 0.02) * breath * motionScale;

        const toCenterX = centerX - p.x;
        const toCenterY = centerY - p.y;
        p.vx += toCenterX * 0.000006 * motionScale;
        p.vy += toCenterY * 0.000006 * motionScale;

        if (!reducedMotion && pointerRef.current.active) {
          const dx = p.x - pointerRef.current.x;
          const dy = p.y - pointerRef.current.y;
          const dist = Math.hypot(dx, dy);
          if (dist < influenceR) {
            const influence = (1 - dist / influenceR) * 0.18;
            p.vx += (dx / (dist || 1)) * influence;
            p.vy += (dy / (dist || 1)) * influence;
            p.vx += -dy / (dist || 1) * influence * 0.5;
            p.vy += dx / (dist || 1) * influence * 0.5;
          }
        }

        if (dragActive) {
          const dx = p.x - pointerRef.current.x;
          const dy = p.y - pointerRef.current.y;
          const dist = Math.hypot(dx, dy);
          if (dist < influenceR * 0.8) {
            p.vx += dragDx * 0.0028;
            p.vy += dragDy * 0.0028;
          }
        }

        let ringGlow = 0;
        ripples.forEach((ripple) => {
          const progress = (now - ripple.startAt) / 1800;
          const dist = Math.hypot(p.x - ripple.x, p.y - ripple.y);
          const delta = Math.abs(dist - ripple.maxR * progress);
          if (delta < fieldH * 0.05) {
            ringGlow = Math.max(ringGlow, 1 - delta / (fieldH * 0.05));
          }
        });

        p.vx *= reducedMotion ? 0.95 : 0.92;
        p.vy *= reducedMotion ? 0.95 : 0.92;
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < fieldX) p.x = fieldX + fieldW;
        if (p.x > fieldX + fieldW) p.x = fieldX;
        if (p.y < fieldY) p.y = fieldY + fieldH;
        if (p.y > fieldY + fieldH) p.y = fieldY;
        if (!inMask(p.x, p.y)) {
          p.vx *= -0.5;
          p.vy *= -0.5;
          p.x += (centerX - p.x) * 0.03;
          p.y += (centerY - p.y) * 0.03;
        }

        const edgeFade = clamp(1 - Math.abs((p.x - centerX) / (fieldW * 0.6)), 0.15, 1);
        let highlightBoost = 0;
        if (highlightCluster !== null) {
          const cluster = clusters[highlightCluster];
          const dist = Math.hypot(p.x - cluster.x, p.y - cluster.y);
          if (dist < fieldH * 0.18) highlightBoost = 0.35 * (1 - dist / (fieldH * 0.18));
        }

        const alpha = clamp(p.lum * edgeFade + ringGlow * 0.5 + highlightBoost, 0.1, 1);
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, 70%, 78%, ${alpha})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsla(${p.hue}, 70%, 70%, 0.35)`;
        ctx.arc(p.x, p.y, p.size * (1 + ringGlow * 0.4 + highlightBoost * 0.4), 0, Math.PI * 2);
        ctx.fill();
      });

      // faint cluster glow on hover
      if (highlightCluster !== null) {
        const cluster = clusters[highlightCluster];
        const glow = ctx.createRadialGradient(cluster.x, cluster.y, fieldH * 0.05, cluster.x, cluster.y, fieldH * 0.25);
        glow.addColorStop(0, "rgba(160,230,230,0.25)");
        glow.addColorStop(1, "rgba(160,230,230,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(fieldX, fieldY, fieldW, fieldH);
      }

      // signal streaks
      streaks = streaks.filter((s) => now - s.startAt < s.duration);
      streaks.forEach((s) => {
        const progress = (now - s.startAt) / s.duration;
        const alpha = Math.sin(progress * Math.PI) * 0.25;
        const x = s.x + s.vx * progress * 60;
        const y = s.y + s.vy * progress * 60;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(170,220,235,${alpha})`;
        ctx.lineWidth = 1.2;
        ctx.moveTo(x, y);
        ctx.lineTo(x - s.vx * 12, y - s.vy * 12);
        ctx.stroke();
      });

      // ripple rings
      ripples.forEach((ripple) => {
        const progress = (now - ripple.startAt) / 1800;
        const alpha = Math.sin(progress * Math.PI) * 0.2;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(160,220,235,${alpha})`;
        ctx.lineWidth = 1.1;
        ctx.arc(ripple.x, ripple.y, ripple.maxR * progress, 0, Math.PI * 2);
        ctx.stroke();
      });

      pointerRef.current.lastX = pointerRef.current.x;
      pointerRef.current.lastY = pointerRef.current.y;
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerdown", pointerDown);
      window.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("pointercancel", pointerUp);
    };
  }, [reducedMotion]);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
