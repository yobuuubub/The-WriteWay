"use client";

import { useEffect, useRef, useState } from "react";
import { isLand, isNearLand } from "../lib/earthMask";

type ParticleGlobeCanvasProps = {
  className?: string;
};

type Point = {
  x: number;
  y: number;
  z: number;
  lat: number;
  lon: number;
  size: number;
  lum: number;
};

type Arc = {
  a: number;
  b: number;
  startAt: number;
  duration: number;
  dash: number;
  gap: number;
};

type Ripple = {
  x: number;
  y: number;
  startAt: number;
  maxR: number;
};

type Orbit = {
  tilt: number;
  phase: number;
  speed: number;
  radius: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export default function ParticleGlobeCanvas({ className }: ParticleGlobeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef({ x: 0, y: 0, active: false, down: false });
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
    let radius = 0;
    let points: Point[] = [];
    let arcs: Arc[] = [];
    let ripples: Ripple[] = [];
    let orbits: Orbit[] = [];
    let nextArcAt = performance.now() + 1400;
    let nextCometAt = performance.now() + 2200;
    let cometOrbit = 0;
    let cometPhase = 0;

    let rotY = 0.2;
    let rotX = -0.1;
    let parallaxYaw = 0;
    let parallaxPitch = 0;
    let targetYaw = 0;
    let targetPitch = 0;
    let lensX = 0;
    let lensY = 0;
    let lensActive = 0;
    let lensBoost = 0;
    let lastTime = performance.now();

    const initPoints = () => {
      const count = reducedMotion ? 2400 : 3200;
      points = [];
      for (let i = 0; i < count; i++) {
        const u = Math.random() * 2 - 1;
        const lon = Math.random() * Math.PI * 2 - Math.PI;
        const lat = Math.asin(u);
        const s = Math.cos(lat);
        const x = s * Math.cos(lon);
        const y = Math.sin(lat);
        const z = s * Math.sin(lon);
        points.push({
          x,
          y,
          z,
          lat,
          lon,
          size: 0.6 + Math.random() * 1.6,
          lum: 0.55 + Math.random() * 0.4,
        });
      }

      orbits = [
        { tilt: 0.4, phase: 0.1, speed: 0.0005, radius: 1.08 },
        { tilt: -0.2, phase: 1.4, speed: 0.0004, radius: 1.12 },
        { tilt: 0.8, phase: 2.6, speed: 0.0003, radius: 1.05 },
      ];
    };

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      w = canvas.clientWidth * dpr;
      h = canvas.clientHeight * dpr;
      canvas.width = w;
      canvas.height = h;
      centerX = w * 0.55;
      centerY = h * 0.52;
      radius = Math.min(w, h) * 0.35;
      initPoints();
    };

    const pointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) * dpr;
      const y = (event.clientY - rect.top) * dpr;
      pointerRef.current.active = x >= 0 && y >= 0 && x <= w && y <= h;
      pointerRef.current.x = x;
      pointerRef.current.y = y;
      if (pointerRef.current.active) {
        const nx = clamp((x - centerX) / radius, -1, 1);
        const ny = clamp((y - centerY) / radius, -1, 1);
        targetYaw = nx * 0.35;
        targetPitch = ny * 0.22;
      }
    };

    const pointerDown = (event: PointerEvent) => {
      pointerMove(event);
      pointerRef.current.down = true;
      if (!reducedMotion) {
        ripples.push({
          x: pointerRef.current.x,
          y: pointerRef.current.y,
          startAt: performance.now(),
          maxR: radius * 1.4,
        });
        lensBoost = 1;
      }
    };

    const pointerUp = () => {
      pointerRef.current.down = false;
    };

    const spawnArc = (now: number) => {
      if (points.length < 2) return;
      const a = Math.floor(Math.random() * points.length);
      let b = Math.floor(Math.random() * points.length);
      if (b === a) b = (b + 11) % points.length;
      arcs.push({
        a,
        b,
        startAt: now,
        duration: 3000 + Math.random() * 2000,
        dash: 26 + Math.random() * 18,
        gap: 120 + Math.random() * 120,
      });
      if (arcs.length > 3) arcs.shift();
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
      const dt = Math.min((now - lastTime) / 16.6667, 2);
      lastTime = now;
      ctx.clearRect(0, 0, w, h);

      const pulse = 1;
      const speedY = reducedMotion ? 0 : 0.0045;
      const speedX = reducedMotion ? 0 : 0.0016;

      rotY += speedY * dt;
      rotX += speedX * dt;
      parallaxYaw += (targetYaw - parallaxYaw) * 0.06;
      parallaxPitch += (targetPitch - parallaxPitch) * 0.06;

      const appliedRotY = rotY + parallaxYaw;
      const appliedRotX = rotX + parallaxPitch;

      const cosY = Math.cos(appliedRotY);
      const sinY = Math.sin(appliedRotY);
      const cosX = Math.cos(appliedRotX);
      const sinX = Math.sin(appliedRotX);

      const projected: { x: number; y: number; z: number; size: number; lum: number; depth: number; nx: number; ny: number; nz: number; lat: number; lon: number }[] = [];

      const lensRadius = Math.min(w, h) * 0.22;
      const lensStrength = 16;
      const lensSwirl = reducedMotion ? 0 : 9;
      const px = pointerRef.current.x;
      const py = pointerRef.current.y;
      const targetLensX = pointerRef.current.active ? px : centerX;
      const targetLensY = pointerRef.current.active ? py : centerY;
      lensX += (targetLensX - lensX) * 0.12;
      lensY += (targetLensY - lensY) * 0.12;
      lensActive += (pointerRef.current.active ? 1 : 0) * 0.08 - lensActive * 0.08;
      lensActive = clamp(lensActive, 0, 1);
      lensBoost += (0 - lensBoost) * 0.08;

      const ringBoost: { x: number; y: number; r: number }[] = [];
      ripples = ripples.filter((ripple) => now - ripple.startAt < 1600);
      ripples.forEach((ripple) => {
        const progress = (now - ripple.startAt) / 1600;
        ringBoost.push({ x: ripple.x, y: ripple.y, r: ripple.maxR * progress });
      });

      points.forEach((p) => {
        const y1 = p.y * cosX - p.z * sinX;
        const z1 = p.y * sinX + p.z * cosX;
        const x2 = p.x * cosY + z1 * sinY;
        const z2 = -p.x * sinY + z1 * cosY;

        const depth = (z2 + 1) / 2;
        const scale = (radius * pulse) / (1.6 - z2 * 0.6);
        const x = centerX + x2 * scale;
        const y = centerY + y1 * scale;

        let glowBoost = 0;
        ringBoost.forEach((ring) => {
          const dist = Math.hypot(x - ring.x, y - ring.y);
          const delta = Math.abs(dist - ring.r);
          if (delta < radius * 0.08) glowBoost = Math.max(glowBoost, 1 - delta / (radius * 0.08));
        });

        projected.push({
          x,
          y,
          z: z2,
          size: p.size,
          lum: p.lum * (0.4 + depth * 0.9 + glowBoost * 0.5),
          depth,
          nx: x2,
          ny: y1,
          nz: z2,
          lat: p.lat,
          lon: p.lon,
        });
      });

      projected.sort((a, b) => a.z - b.z);

      const lightDir = { x: 0.6, y: 0.2, z: 0.75 };

      projected.forEach((p) => {
        const isFront = p.nz > 0;
        let pxs = p.x;
        let pys = p.y;
        const d = clamp(p.depth, 0, 1);
        let sizeBoost = 0;
        let alphaBoost = 0;

        if (isFront) {
          const dx = pxs - lensX;
          const dy = pys - lensY;
          const dist = Math.hypot(dx, dy);
          if (dist < lensRadius) {
            const falloff = 1 - dist / lensRadius;
            const inv = 1 / (dist || 1);
            if (!reducedMotion) {
              pxs += dx * inv * falloff * lensStrength * lensActive;
              pys += dy * inv * falloff * lensStrength * lensActive;
              pxs += -dy * inv * falloff * lensSwirl * lensActive;
              pys += dx * inv * falloff * lensSwirl * lensActive;
            }
            sizeBoost = falloff * 1.4;
            alphaBoost = falloff * 0.22 * (0.7 + lensBoost);
          }
        }

        const land = isLand(p.lat, p.lon);
        const nearLand = !land && isNearLand(p.lat, p.lon);
        const absLat = Math.abs(p.lat);
        const ice = absLat > (60 * Math.PI / 180);
        const desert = land && absLat > (15 * Math.PI / 180) && absLat < (35 * Math.PI / 180);

        let baseColor = land ? { r: 70, g: 170, b: 90 } : { r: 30, g: 80, b: 160 };
        if (nearLand) baseColor = { r: 80, g: 150, b: 200 };
        if (desert) baseColor = { r: 190, g: 170, b: 110 };
        if (ice) baseColor = { r: 210, g: 230, b: 245 };

        const light = 0.55 + 0.45 * d;
        const alpha = clamp(0.18 + 0.6 * d + alphaBoost, 0.18, 0.9);

        const nDotL = clamp(p.nx * lightDir.x + p.ny * lightDir.y + p.nz * lightDir.z, 0, 1);
        const terminator = 0.65 + nDotL * 0.35;

        const r = Math.min(255, baseColor.r * light * terminator);
        const g = Math.min(255, baseColor.g * light * terminator);
        const b = Math.min(255, baseColor.b * light * terminator);

        ctx.beginPath();
        ctx.fillStyle = `rgba(${r.toFixed(0)}, ${g.toFixed(0)}, ${b.toFixed(0)}, ${alpha.toFixed(3)})`;
        ctx.shadowBlur = 0;
        ctx.arc(pxs, pys, p.size * (0.6 + p.lum * 0.7 + sizeBoost * 0.7), 0, Math.PI * 2);
        ctx.fill();
      });

      const desiredArcs = 2;
      if (!reducedMotion && arcs.length < desiredArcs && now > nextArcAt) {
        spawnArc(now);
        nextArcAt = now + 900 + Math.random() * 1200;
      }

      arcs = arcs.filter((arc) => now - arc.startAt < arc.duration);
      if (!reducedMotion && arcs.length === 0) {
        spawnArc(now);
      }
      arcs.forEach((arc) => {
        const start = projected[arc.a];
        const end = projected[arc.b];
        if (!start || !end) return;
        const progress = (now - arc.startAt) / arc.duration;
        const fadeIn = clamp(progress / 0.15, 0, 1);
        const fadeOut = clamp((1 - progress) / 0.2, 0, 1);
        const alpha = Math.min(fadeIn, fadeOut) * 0.55;
        const cx = (start.x + end.x) / 2 + (Math.sin(progress * Math.PI * 2) * radius * 0.2);
        const cy = (start.y + end.y) / 2 - radius * 0.18;
        ctx.save();
        ctx.globalAlpha = alpha;
        const arcGradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
        arcGradient.addColorStop(0, "rgba(120,180,240,0.35)");
        arcGradient.addColorStop(0.6, "rgba(150,220,220,0.6)");
        arcGradient.addColorStop(1, "rgba(200,230,255,0.65)");
        ctx.strokeStyle = arcGradient;
        ctx.lineWidth = 1;
        ctx.setLineDash([arc.dash, arc.gap]);
        ctx.lineDashOffset = -progress * 240;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.quadraticCurveTo(cx, cy, end.x, end.y);
        ctx.stroke();
        ctx.restore();
      });

      // Orbit trails
      orbits.forEach((orbit, idx) => {
        orbit.phase += orbit.speed * dt;
        const tilt = orbit.tilt + Math.sin(time * 0.2 + idx) * 0.08;
        const rx = radius * orbit.radius;
        const ry = rx * Math.cos(tilt);
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(orbit.phase);
        ctx.strokeStyle = "rgba(140,210,220,0.22)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, Math.abs(ry), tilt, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      if (!reducedMotion && now > nextCometAt) {
        cometOrbit = Math.floor(Math.random() * orbits.length);
        cometPhase = Math.random() * Math.PI * 2;
        nextCometAt = now + 3600 + Math.random() * 4000;
      }

      if (!reducedMotion && orbits[cometOrbit]) {
        const orbit = orbits[cometOrbit];
        cometPhase += 0.02 * dt;
        const rx = radius * orbit.radius;
        const ry = rx * Math.cos(orbit.tilt);
        const x = centerX + Math.cos(cometPhase) * rx;
        const y = centerY + Math.sin(cometPhase) * Math.abs(ry);
        ctx.beginPath();
        ctx.fillStyle = "rgba(160,230,235,0.7)";
        ctx.shadowBlur = 0;
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reducedMotion) {
        ripples.forEach((ripple) => {
          const progress = (now - ripple.startAt) / 1600;
          const alpha = Math.sin(progress * Math.PI) * 0.2;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(150,220,235,${alpha})`;
          ctx.lineWidth = 1;
          ctx.arc(ripple.x, ripple.y, ripple.maxR * progress, 0, Math.PI * 2);
          ctx.stroke();
        });
      }
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
