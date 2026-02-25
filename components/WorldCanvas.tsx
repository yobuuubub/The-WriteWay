"use client";

import { useEffect, useRef, useState } from "react";

type WorldCanvasProps = {
  className?: string;
  highlightIndex?: number | null;
};

type Particle = {
  baseR: number;
  radius: number;
  angle: number;
  speed: number;
  size: number;
  lum: number;
  cluster: number;
  offsetX: number;
  offsetY: number;
  seed: number;
};

type Star = {
  x: number;
  y: number;
  z: number;
  r: number;
  tw: number;
};

type Arc = {
  start: number;
  end: number;
  startAt: number;
  duration: number;
  bend: number;
  dash: number;
  gap: number;
  speed: number;
};

type Spark = {
  cluster: number;
  startAt: number;
  duration: number;
  sparks: { angle: number; speed: number; life: number }[];
};

type RingPulse = {
  startAt: number;
  duration: number;
  maxR: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export default function WorldCanvas({ className, highlightIndex }: WorldCanvasProps) {
  const layerARef = useRef<HTMLCanvasElement | null>(null);
  const layerBRef = useRef<HTMLCanvasElement | null>(null);
  const layerCRef = useRef<HTMLCanvasElement | null>(null);
  const hoverRef = useRef<number | null>(null);
  const pointerRef = useRef({ x: 0, y: 0, active: false });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    hoverRef.current = highlightIndex ?? null;
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
    const canvasA = layerARef.current;
    const canvasB = layerBRef.current;
    const canvasC = layerCRef.current;
    if (!canvasA || !canvasB || !canvasC) return;

    const ctxA = canvasA.getContext("2d");
    const ctxB = canvasB.getContext("2d");
    const ctxC = canvasC.getContext("2d");
    if (!ctxA || !ctxB || !ctxC) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let bounds = canvasB.getBoundingClientRect();
    let centerX = 0;
    let centerY = 0;
    let radius = 0;
    let particles: Particle[] = [];
    let stars: Star[] = [];
    let arcs: Arc[] = [];
    let spark: Spark | null = null;
    let ring: RingPulse | null = null;
    let nextSparkAt = performance.now() + 3400;
    let nextArcAt = performance.now() + 1600;
    let nextRingAt = performance.now() + 12000;
    const clusterCount = 9;
    let clusterCenters = Array.from({ length: clusterCount }, () => ({ x: 0, y: 0, count: 0 }));

    const noiseCanvas = document.createElement("canvas");
    const noiseSize = 128;
    noiseCanvas.width = noiseSize;
    noiseCanvas.height = noiseSize;
    const noiseCtx = noiseCanvas.getContext("2d");
    if (noiseCtx) {
      const img = noiseCtx.createImageData(noiseSize, noiseSize);
      for (let i = 0; i < img.data.length; i += 4) {
        const n = Math.floor(Math.random() * 255);
        img.data[i] = n;
        img.data[i + 1] = n;
        img.data[i + 2] = n;
        img.data[i + 3] = 20;
      }
      noiseCtx.putImageData(img, 0, 0);
    }

    const initParticles = (dpr: number) => {
      const minDim = Math.min(w, h);
      const baseCount = reducedMotion ? minDim * 0.32 : minDim * 0.68;
      const count = clamp(Math.round(baseCount), 260, reducedMotion ? 420 : 860);
      particles = [];
      clusterCenters = Array.from({ length: clusterCount }, () => ({ x: 0, y: 0, count: 0 }));
      for (let i = 0; i < count; i++) {
        const t = i / count;
        const baseAngle = t * Math.PI * 2;
        const ringOffset = (Math.sin(t * Math.PI * 6) + 1) * 0.12;
        const baseR = radius * (0.46 + ringOffset);
        const angleJitter = (Math.random() - 0.5) * 0.2;
        const cluster = Math.floor((i / count) * clusterCount);
        const size = (0.6 + Math.random() * 1.2) * dpr;
        const lum = 0.55 + Math.random() * 0.45;
        particles.push({
          baseR,
          radius: baseR,
          angle: baseAngle + angleJitter,
          speed: 0.0007 + Math.random() * 0.0011,
          size,
          lum,
          cluster,
          offsetX: 0,
          offsetY: 0,
          seed: Math.random() * 1000,
        });
      }

      particles.forEach((p) => {
        const x = centerX + Math.cos(p.angle) * p.radius;
        const y = centerY + Math.sin(p.angle) * p.radius * 0.9;
        const c = clusterCenters[p.cluster];
        c.x += x;
        c.y += y;
        c.count += 1;
      });
      clusterCenters = clusterCenters.map((c) => ({
        x: c.count ? c.x / c.count : centerX,
        y: c.count ? c.y / c.count : centerY,
        count: c.count,
      }));
    };

    const initStars = () => {
      const count = reducedMotion ? 140 : 260;
      stars = [];
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          z: Math.random(),
          r: Math.random() * 1.4 + 0.2,
          tw: Math.random() * Math.PI * 2,
        });
      }
    };

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      w = canvasA.clientWidth * dpr;
      h = canvasA.clientHeight * dpr;
      canvasA.width = w;
      canvasA.height = h;
      canvasB.width = w;
      canvasB.height = h;
      canvasC.width = w;
      canvasC.height = h;
      bounds = canvasB.getBoundingClientRect();
      centerX = w / 2;
      centerY = h * 0.46;
      radius = Math.min(w, h) * 0.28;
      initParticles(dpr);
      initStars();
    };

    const pointerMove = (event: PointerEvent) => {
      const localX = event.clientX - bounds.left;
      const localY = event.clientY - bounds.top;
      if (localX < 0 || localY < 0 || localX > bounds.width || localY > bounds.height) {
        pointerRef.current.active = false;
        return;
      }
      pointerRef.current.x = localX * dpr;
      pointerRef.current.y = localY * dpr;
      pointerRef.current.active = true;
    };

    const flowAngle = (x: number, y: number, t: number) => {
      const nx = (x - centerX) / radius;
      const ny = (y - centerY) / radius;
      return Math.sin(nx * 2.8 + t * 0.5) + Math.cos(ny * 2.2 - t * 0.35);
    };

    const spawnArc = (now: number) => {
      const start = Math.floor(Math.random() * clusterCount);
      let end = Math.floor(Math.random() * clusterCount);
      if (end === start) end = (end + 2) % clusterCount;
      arcs.push({
        start,
        end,
        startAt: now,
        duration: 3200 + Math.random() * 2000,
        bend: (Math.random() - 0.5) * radius * 0.7,
        dash: 18 + Math.random() * 18,
        gap: 120 + Math.random() * 120,
        speed: 160 + Math.random() * 120,
      });
      if (arcs.length > 3) arcs.shift();
    };

    const spawnSpark = (now: number) => {
      const cluster = Math.floor(Math.random() * clusterCount);
      spark = {
        cluster,
        startAt: now,
        duration: 1500 + Math.random() * 800,
        sparks: Array.from({ length: 2 + Math.floor(Math.random() * 2) }, () => ({
          angle: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 0.8,
          life: 400 + Math.random() * 380,
        })),
      };
    };

    const spawnRing = (now: number) => {
      ring = {
        startAt: now,
        duration: 3200,
        maxR: radius * 1.4,
      };
    };

    resize();
    window.addEventListener("resize", resize);
    if (!reducedMotion) {
      window.addEventListener("pointermove", pointerMove, { passive: true });
      window.addEventListener("pointerdown", pointerMove, { passive: true });
    }

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const time = now * 0.001;
      const breathPeriod = reducedMotion ? 9.5 : 7.6;
      const breath = 1 + Math.sin((time * Math.PI * 2) / breathPeriod) * (reducedMotion ? 0.03 : 0.06);
      const breathAlpha = 0.7 + Math.sin((time * Math.PI * 2) / breathPeriod) * 0.15;

      ctxA.clearRect(0, 0, w, h);
      ctxB.clearRect(0, 0, w, h);
      ctxC.clearRect(0, 0, w, h);

      const bg = ctxA.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#031629");
      bg.addColorStop(0.6, "#041327");
      bg.addColorStop(1, "#02030a");
      ctxA.fillStyle = bg;
      ctxA.fillRect(0, 0, w, h);

      const nebulaX = centerX + Math.cos(time * 0.08) * radius * 0.8;
      const nebulaY = centerY + Math.sin(time * 0.06) * radius * 0.6;
      const nebula = ctxA.createRadialGradient(nebulaX, nebulaY, radius * 0.2, nebulaX, nebulaY, radius * 1.4);
      nebula.addColorStop(0, "rgba(90,160,220,0.08)");
      nebula.addColorStop(0.45, "rgba(120,90,190,0.05)");
      nebula.addColorStop(1, "rgba(10,10,20,0)");
      ctxA.fillStyle = nebula;
      ctxA.fillRect(0, 0, w, h);

      stars.forEach((star) => {
        const drift = time * (0.04 + star.z * 0.08);
        const sx = (star.x + drift * w * 0.2) % w;
        const sy = (star.y + drift * h * 0.08) % h;
        const tw = (Math.sin(time * 1.1 + star.tw) + 1) * 0.5;
        ctxA.fillStyle = `rgba(200,235,255,${0.08 + star.z * 0.2 + tw * 0.08})`;
        ctxA.fillRect(sx, sy, star.r, star.r);
      });

      ctxA.save();
      ctxA.globalAlpha = 0.04;
      ctxA.drawImage(noiseCanvas, 0, 0, w, h);
      ctxA.restore();

      const globeGlow = ctxB.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius * 1.1);
      globeGlow.addColorStop(0, "rgba(110,210,220,0.18)");
      globeGlow.addColorStop(0.45, "rgba(80,140,200,0.12)");
      globeGlow.addColorStop(1, "rgba(10,20,40,0)");
      ctxB.fillStyle = globeGlow;
      ctxB.fillRect(0, 0, w, h);

      if (now > nextSparkAt && !reducedMotion) {
        spawnSpark(now);
        nextSparkAt = now + 4200 + Math.random() * 4200;
      }

      if (now > nextRingAt) {
        spawnRing(now);
        nextRingAt = now + (reducedMotion ? 18000 : 12000 + Math.random() * 6000);
      }

      const highlightCluster = hoverRef.current === null ? null : hoverRef.current % clusterCount;
      let ringRadius = -1;
      let ringProgress = 0;
      if (ring) {
        ringProgress = (now - ring.startAt) / ring.duration;
        if (ringProgress > 1) {
          ring = null;
        } else {
          ringRadius = ring.maxR * ringProgress;
        }
      }

      particles.forEach((p) => {
        const baseAngle = p.angle + time * p.speed;
        const flow = flowAngle(centerX + Math.cos(baseAngle) * p.radius, centerY + Math.sin(baseAngle) * p.radius, time);
        const swirl = Math.sin(time * 0.7 + p.seed) * 0.5 + flow * 0.4;
        p.angle += p.speed + swirl * 0.002;
        const drift = Math.sin(time * 0.9 + p.seed) * 2.6;
        const targetR = p.baseR * breath + drift;
        p.radius += (targetR - p.radius) * 0.04;

        let x = centerX + Math.cos(p.angle) * p.radius;
        let y = centerY + Math.sin(p.angle) * p.radius * 0.92;

        if (pointerRef.current.active && !reducedMotion) {
          const dx = x - pointerRef.current.x;
          const dy = y - pointerRef.current.y;
          const dist = Math.hypot(dx, dy);
          const influence = radius * 0.6;
          if (dist < influence) {
            const force = (1 - dist / influence) * 0.8;
            const sign = Math.sin(time * 0.6) * 0.5;
            p.offsetX += (dx / (dist || 1)) * force * sign;
            p.offsetY += (dy / (dist || 1)) * force * sign;
          }
        }

        p.offsetX *= 0.92;
        p.offsetY *= 0.92;
        x += p.offsetX;
        y += p.offsetY;

        let glowBoost = 0;
        if (spark && spark.cluster === p.cluster) {
          const sp = (now - spark.startAt) / spark.duration;
          if (sp <= 1) glowBoost += (1 - sp) * 0.5;
        }
        if (highlightCluster !== null && highlightCluster === p.cluster) {
          glowBoost += 0.45;
        }
        if (ring && ringRadius > 0) {
          const dist = Math.hypot(x - centerX, y - centerY);
          const ringInfluence = 1 - Math.abs(dist - ringRadius) / (radius * 0.15);
          if (ringInfluence > 0) glowBoost += ringInfluence * 0.25;
        }

        const alpha = clamp(p.lum * (breathAlpha + glowBoost), 0.12, 1);
        ctxB.beginPath();
        ctxB.fillStyle = `rgba(190,236,248,${alpha})`;
        ctxB.shadowBlur = 8;
        ctxB.shadowColor = "rgba(130,200,210,0.4)";
        const size = p.size * (1 + glowBoost * 0.5);
        ctxB.arc(x, y, size, 0, Math.PI * 2);
        ctxB.fill();
      });

      if (spark) {
        const sp = (now - spark.startAt) / spark.duration;
        if (sp > 1) {
          spark = null;
        } else {
          const center = clusterCenters[spark.cluster];
          spark.sparks.forEach((s) => {
            const life = 1 - Math.max(0, (now - spark.startAt) / s.life);
            if (life <= 0) return;
            const dist = (1 - life) * radius * 0.08;
            const x = center.x + Math.cos(s.angle) * dist;
            const y = center.y + Math.sin(s.angle) * dist;
            ctxB.beginPath();
            ctxB.fillStyle = `rgba(255,240,220,${life * 0.6})`;
            ctxB.arc(x, y, 1.2, 0, Math.PI * 2);
            ctxB.fill();
          });
        }
      }

      if (now > nextArcAt) {
        spawnArc(now);
        nextArcAt = now + (reducedMotion ? 4200 : 2200 + Math.random() * 3000);
      }

      arcs = arcs.filter((arc) => now - arc.startAt < arc.duration);
      arcs.forEach((arc) => {
        const progress = (now - arc.startAt) / arc.duration;
        const alpha = Math.sin(progress * Math.PI) * 0.9;
        const start = clusterCenters[arc.start];
        const end = clusterCenters[arc.end];
        const cx = (start.x + end.x) / 2 + arc.bend;
        const cy = (start.y + end.y) / 2 - arc.bend * 0.2;
        ctxC.save();
        ctxC.globalAlpha = alpha;
        ctxC.strokeStyle = "rgba(170,230,240,0.85)";
        ctxC.lineWidth = 1.1 + alpha * 1.4;
        ctxC.setLineDash([arc.dash, arc.gap]);
        ctxC.lineDashOffset = -progress * arc.speed;
        ctxC.beginPath();
        ctxC.moveTo(start.x, start.y);
        ctxC.quadraticCurveTo(cx, cy, end.x, end.y);
        ctxC.stroke();
        ctxC.restore();
      });

      if (ring && ringRadius > 0) {
        const ringAlpha = Math.sin(ringProgress * Math.PI) * 0.25;
        ctxC.beginPath();
        ctxC.strokeStyle = `rgba(160,215,235,${ringAlpha})`;
        ctxC.lineWidth = 1.2;
        ctxC.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctxC.stroke();
      }

      if (highlightCluster !== null) {
        const target = clusterCenters[highlightCluster];
        ctxC.save();
        ctxC.strokeStyle = "rgba(190,245,245,0.55)";
        ctxC.lineWidth = 1.4;
        ctxC.setLineDash([6, 12]);
        ctxC.lineDashOffset = -time * 30;
        ctxC.beginPath();
        ctxC.moveTo(centerX, centerY);
        ctxC.quadraticCurveTo((centerX + target.x) / 2 + 18, (centerY + target.y) / 2 - 12, target.x, target.y);
        ctxC.stroke();
        ctxC.restore();
      }
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      if (!reducedMotion) {
        window.removeEventListener("pointermove", pointerMove);
        window.removeEventListener("pointerdown", pointerMove);
      }
    };
  }, [reducedMotion]);

  return (
    <div className={className} aria-hidden>
      <canvas ref={layerARef} className="world-layer world-layer-a" />
      <canvas ref={layerBRef} className="world-layer world-layer-b" />
      <canvas ref={layerCRef} className="world-layer world-layer-c" />
    </div>
  );
}
