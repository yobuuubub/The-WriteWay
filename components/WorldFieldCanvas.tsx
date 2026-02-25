"use client";

import { useEffect, useRef, useState } from "react";

type WorldFieldCanvasProps = {
  className?: string;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  lum: number;
  hue: number;
};

type Ripple = {
  x: number;
  y: number;
  startAt: number;
  maxR: number;
};

type Arc = {
  a: number;
  b: number;
  startAt: number;
  duration: number;
  dash: number;
  gap: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function drawMapMask(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "white";

  // North America
  ctx.beginPath();
  ctx.moveTo(w * 0.12, h * 0.22);
  ctx.bezierCurveTo(w * 0.18, h * 0.05, w * 0.34, h * 0.08, w * 0.36, h * 0.22);
  ctx.bezierCurveTo(w * 0.42, h * 0.28, w * 0.38, h * 0.46, w * 0.26, h * 0.46);
  ctx.bezierCurveTo(w * 0.16, h * 0.48, w * 0.08, h * 0.36, w * 0.12, h * 0.22);
  ctx.closePath();
  ctx.fill();

  // South America
  ctx.beginPath();
  ctx.moveTo(w * 0.28, h * 0.52);
  ctx.bezierCurveTo(w * 0.36, h * 0.52, w * 0.38, h * 0.68, w * 0.32, h * 0.82);
  ctx.bezierCurveTo(w * 0.26, h * 0.92, w * 0.2, h * 0.82, w * 0.2, h * 0.66);
  ctx.bezierCurveTo(w * 0.2, h * 0.58, w * 0.22, h * 0.54, w * 0.28, h * 0.52);
  ctx.closePath();
  ctx.fill();

  // Eurasia
  ctx.beginPath();
  ctx.moveTo(w * 0.42, h * 0.18);
  ctx.bezierCurveTo(w * 0.5, h * 0.04, w * 0.78, h * 0.08, w * 0.86, h * 0.24);
  ctx.bezierCurveTo(w * 0.92, h * 0.34, w * 0.84, h * 0.5, w * 0.68, h * 0.5);
  ctx.bezierCurveTo(w * 0.6, h * 0.5, w * 0.56, h * 0.44, w * 0.52, h * 0.42);
  ctx.bezierCurveTo(w * 0.44, h * 0.4, w * 0.4, h * 0.28, w * 0.42, h * 0.18);
  ctx.closePath();
  ctx.fill();

  // Africa
  ctx.beginPath();
  ctx.moveTo(w * 0.54, h * 0.46);
  ctx.bezierCurveTo(w * 0.64, h * 0.46, w * 0.68, h * 0.62, w * 0.62, h * 0.78);
  ctx.bezierCurveTo(w * 0.56, h * 0.9, w * 0.46, h * 0.78, w * 0.48, h * 0.62);
  ctx.bezierCurveTo(w * 0.5, h * 0.52, w * 0.5, h * 0.48, w * 0.54, h * 0.46);
  ctx.closePath();
  ctx.fill();

  // Australia
  ctx.beginPath();
  ctx.moveTo(w * 0.78, h * 0.68);
  ctx.bezierCurveTo(w * 0.86, h * 0.66, w * 0.9, h * 0.78, w * 0.84, h * 0.86);
  ctx.bezierCurveTo(w * 0.78, h * 0.92, w * 0.7, h * 0.82, w * 0.72, h * 0.74);
  ctx.closePath();
  ctx.fill();

  // Greenland
  ctx.beginPath();
  ctx.ellipse(w * 0.32, h * 0.08, w * 0.06, h * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();
}

export default function WorldFieldCanvas({ className }: WorldFieldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef({
    x: 0,
    y: 0,
    lastX: 0,
    lastY: 0,
    active: false,
    down: false,
  });
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
    let centerX = 0;
    let centerY = 0;
    let mapW = 0;
    let mapH = 0;
    let mapX = 0;
    let mapY = 0;
    let particles: Particle[] = [];
    let arcs: Arc[] = [];
    let ripples: Ripple[] = [];
    let nextArcAt = performance.now() + 1200;
    const palette = [178, 210, 22]; // hue base for teal/violet/coral blend

    const maskCanvas = document.createElement("canvas");
    const maskCtx = maskCanvas.getContext("2d");
    let maskData: Uint8ClampedArray | null = null;
    let maskW = 0;
    let maskH = 0;

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      w = canvas.clientWidth * dpr;
      h = canvas.clientHeight * dpr;
      canvas.width = w;
      canvas.height = h;
      centerX = w * 0.62;
      centerY = h * 0.52;
      mapH = h * 0.72;
      mapW = mapH * 1.55;
      mapX = centerX - mapW / 2;
      mapY = centerY - mapH / 2;

      maskW = 360;
      maskH = 180;
      maskCanvas.width = maskW;
      maskCanvas.height = maskH;
      if (maskCtx) {
        drawMapMask(maskCtx, maskW, maskH);
        maskData = maskCtx.getImageData(0, 0, maskW, maskH).data;
      }

      const countBase = reducedMotion ? 420 : 780;
      const targetCount = clamp(Math.round((mapW * mapH) / 14000), 360, countBase);
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
            px = mapX + rx * mapW;
            py = mapY + ry * mapH;
            break;
          }
          tries += 1;
        }
        particles.push({
          x: px || mapX + Math.random() * mapW,
          y: py || mapY + Math.random() * mapH,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          size: (0.8 + Math.random() * 1.6) * dpr,
          lum: 0.6 + Math.random() * 0.4,
          hue: palette[i % palette.length] + Math.random() * 6,
        });
      }
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

    const spawnArc = (now: number) => {
      if (particles.length < 2) return;
      const a = Math.floor(Math.random() * particles.length);
      let b = Math.floor(Math.random() * particles.length);
      if (b === a) b = (b + 17) % particles.length;
      arcs.push({
        a,
        b,
        startAt: now,
        duration: 2800 + Math.random() * 1200,
        dash: 20 + Math.random() * 18,
        gap: 140 + Math.random() * 120,
      });
      if (arcs.length > 2) arcs.shift();
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
      const motionScale = reducedMotion ? 0.2 : 1;
      const breath = 1 + Math.sin(time * Math.PI * 2 / 8.5) * (reducedMotion ? 0.01 : 0.04);

      ctx.clearRect(0, 0, w, h);

      const bg = ctx.createRadialGradient(centerX, centerY, mapH * 0.1, centerX, centerY, mapH * 0.75);
      bg.addColorStop(0, "rgba(16,48,76,0.8)");
      bg.addColorStop(0.4, "rgba(5,18,36,0.9)");
      bg.addColorStop(1, "rgba(2,3,8,0.96)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Map silhouette glow
      if (maskCtx) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 0.12;
        ctx.drawImage(maskCanvas, mapX, mapY, mapW, mapH);
        ctx.restore();
      }

      if (!reducedMotion && now > nextArcAt) {
        spawnArc(now);
        nextArcAt = now + 2400 + Math.random() * 3200;
      }

      const dragDx = pointerRef.current.x - pointerRef.current.lastX;
      const dragDy = pointerRef.current.y - pointerRef.current.lastY;
      const dragActive = pointerRef.current.down && pointerRef.current.active && !reducedMotion;
      const influenceR = mapH * 0.32;

      const ringBoost: { x: number; y: number; r: number }[] = [];
      ripples = ripples.filter((ripple) => now - ripple.startAt < 1600);
      ripples.forEach((ripple) => {
        const progress = (now - ripple.startAt) / 1600;
        ringBoost.push({ x: ripple.x, y: ripple.y, r: ripple.maxR * progress });
      });

      const inMask = (x: number, y: number) => {
        if (!maskData) return true;
        const mx = Math.floor(((x - mapX) / mapW) * maskW);
        const my = Math.floor(((y - mapY) / mapH) * maskH);
        if (mx < 0 || my < 0 || mx >= maskW || my >= maskH) return false;
        return maskData[(my * maskW + mx) * 4 + 3] > 10;
      };

      particles.forEach((p) => {
        const flow = flowField(p.x, p.y, time);
        const swirl = Math.sin((p.x + p.y) * 0.002 + time * 0.6) * 0.4;
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
            p.vx += -dy / (dist || 1) * influence * 0.4;
            p.vy += dx / (dist || 1) * influence * 0.4;
          }
        }

        if (dragActive) {
          const dx = p.x - pointerRef.current.x;
          const dy = p.y - pointerRef.current.y;
          const dist = Math.hypot(dx, dy);
          if (dist < influenceR * 0.8) {
            p.vx += dragDx * 0.003;
            p.vy += dragDy * 0.003;
          }
        }

        let ringGlow = 0;
        ringBoost.forEach((ring) => {
          const dist = Math.hypot(p.x - ring.x, p.y - ring.y);
          const delta = Math.abs(dist - ring.r);
          if (delta < mapH * 0.05) {
            ringGlow = Math.max(ringGlow, 1 - delta / (mapH * 0.05));
          }
        });

        p.vx *= reducedMotion ? 0.94 : 0.92;
        p.vy *= reducedMotion ? 0.94 : 0.92;
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < mapX) p.x = mapX + mapW;
        if (p.x > mapX + mapW) p.x = mapX;
        if (p.y < mapY) p.y = mapY + mapH;
        if (p.y > mapY + mapH) p.y = mapY;
        if (!inMask(p.x, p.y)) {
          p.vx *= -0.6;
          p.vy *= -0.6;
          p.x += (centerX - p.x) * 0.04;
          p.y += (centerY - p.y) * 0.04;
        }

        const alpha = clamp(p.lum + ringGlow * 0.45, 0.2, 1);
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, 85%, 78%, ${alpha})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsla(${p.hue}, 80%, 70%, 0.45)`;
        ctx.arc(p.x, p.y, p.size * (1 + ringGlow * 0.4), 0, Math.PI * 2);
        ctx.fill();
      });

      // Arcs
      arcs = arcs.filter((arc) => now - arc.startAt < arc.duration);
      arcs.forEach((arc) => {
        const progress = (now - arc.startAt) / arc.duration;
        const alpha = Math.sin(progress * Math.PI) * 0.6;
        const start = particles[arc.a];
        const end = particles[arc.b];
        if (!start || !end) return;
        const cx = (start.x + end.x) / 2 + (Math.random() - 0.5) * mapH * 0.08;
        const cy = (start.y + end.y) / 2 - mapH * 0.1;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = "rgba(180,235,245,0.9)";
        ctx.lineWidth = 1.2 + alpha * 1.2;
        ctx.setLineDash([arc.dash, arc.gap]);
        ctx.lineDashOffset = -progress * 220;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.quadraticCurveTo(cx, cy, end.x, end.y);
        ctx.stroke();
        ctx.restore();
      });

      // Ripple rings
      ripples.forEach((ripple) => {
        const progress = (now - ripple.startAt) / 1600;
        const alpha = Math.sin(progress * Math.PI) * 0.25;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(160,220,235,${alpha})`;
        ctx.lineWidth = 1.2;
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
