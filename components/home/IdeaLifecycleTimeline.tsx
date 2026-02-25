"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";

// Top hero is locked; do not modify.

type PhaseId = "spark" | "exploration" | "structure" | "refinement" | "voice" | "ready";

type Phase = {
  id: PhaseId;
  title: string;
  microcopy: string;
  accent: string;
  accentSoft: string;
  atmosphere: string;
  lineTexture: string;
  lineActiveTexture: string;
  pulseAnimation: string;
  motionClass: string;
  questionVariants?: string[];
};

const phases: Phase[] = [
  {
    id: "spark",
    title: "Spark",
    microcopy: "A question that won't leave you alone.",
    accent: "251 191 36",
    accentSoft: "253 230 138",
    atmosphere:
      "radial-gradient(circle at 20% 20%, rgba(251,191,36,0.18), transparent 55%), radial-gradient(circle at 75% 10%, rgba(125,211,252,0.18), transparent 52%), linear-gradient(135deg, rgba(8,14,22,0.98), rgba(12,16,28,0.95))",
    lineTexture:
      "repeating-linear-gradient(to bottom, rgba(255,255,255,0.45) 0 2px, transparent 2px 8px)",
    lineActiveTexture:
      "repeating-linear-gradient(to bottom, rgb(var(--accent) / 0.9) 0 2px, transparent 2px 8px)",
    pulseAnimation: "pulse-breathe",
    motionClass: "motion-drift",
    questionVariants: [
      "Why does this story keep returning?",
      "What is the moment that changes everything?",
      "Where does the truth start to glow?",
    ],
  },
  {
    id: "exploration",
    title: "Exploration",
    microcopy: "Too many thoughts. That's a good sign.",
    accent: "167 139 250",
    accentSoft: "196 181 253",
    atmosphere:
      "radial-gradient(circle at 30% 15%, rgba(167,139,250,0.2), transparent 60%), radial-gradient(circle at 80% 45%, rgba(94,234,212,0.14), transparent 55%), linear-gradient(135deg, rgba(9,11,22,0.98), rgba(14,10,26,0.94))",
    lineTexture:
      "repeating-linear-gradient(to bottom, rgba(255,255,255,0.4) 0 3px, transparent 3px 6px, rgba(255,255,255,0.2) 6px 7px, transparent 7px 12px)",
    lineActiveTexture:
      "repeating-linear-gradient(to bottom, rgb(var(--accent) / 0.8) 0 3px, transparent 3px 6px, rgb(var(--accent) / 0.4) 6px 7px, transparent 7px 12px)",
    pulseAnimation: "pulse-flicker",
    motionClass: "motion-chaos",
  },
  {
    id: "structure",
    title: "Structure",
    microcopy: "You don't kill the idea - you give it bones.",
    accent: "96 165 250",
    accentSoft: "147 197 253",
    atmosphere:
      "radial-gradient(circle at 20% 60%, rgba(59,130,246,0.16), transparent 55%), radial-gradient(circle at 85% 20%, rgba(94,234,212,0.12), transparent 55%), linear-gradient(135deg, rgba(7,13,22,0.98), rgba(9,16,30,0.96))",
    lineTexture: "linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(255,255,255,0.15))",
    lineActiveTexture: "linear-gradient(to bottom, rgb(var(--accent) / 0.85), rgb(var(--accent) / 0.3))",
    pulseAnimation: "pulse-snap",
    motionClass: "motion-snap",
  },
  {
    id: "refinement",
    title: "Refinement",
    microcopy: "Make every sentence earn its place.",
    accent: "45 212 191",
    accentSoft: "153 246 228",
    atmosphere:
      "radial-gradient(circle at 15% 25%, rgba(45,212,191,0.16), transparent 55%), radial-gradient(circle at 75% 75%, rgba(56,189,248,0.12), transparent 60%), linear-gradient(135deg, rgba(6,14,20,0.98), rgba(8,18,26,0.95))",
    lineTexture:
      "repeating-linear-gradient(to bottom, rgba(255,255,255,0.7) 0 4px, transparent 4px 6px)",
    lineActiveTexture:
      "repeating-linear-gradient(to bottom, rgb(var(--accent) / 0.9) 0 4px, transparent 4px 6px)",
    pulseAnimation: "pulse-steady",
    motionClass: "motion-precision",
  },
  {
    id: "voice",
    title: "Voice",
    microcopy: "Now it sounds like you.",
    accent: "244 114 182",
    accentSoft: "251 207 232",
    atmosphere:
      "radial-gradient(circle at 20% 25%, rgba(244,114,182,0.2), transparent 55%), radial-gradient(circle at 78% 75%, rgba(253,186,116,0.14), transparent 60%), linear-gradient(135deg, rgba(10,10,18,0.98), rgba(17,13,24,0.96))",
    lineTexture:
      "repeating-linear-gradient(to bottom, rgba(255,255,255,0.45) 0 6px, transparent 6px 10px)",
    lineActiveTexture:
      "repeating-linear-gradient(to bottom, rgb(var(--accent) / 0.85) 0 6px, transparent 6px 10px)",
    pulseAnimation: "pulse-warm",
    motionClass: "motion-signature",
  },
  {
    id: "ready",
    title: "Ready",
    microcopy: "Let it go. It's ready to exist.",
    accent: "134 239 172",
    accentSoft: "187 247 208",
    atmosphere:
      "radial-gradient(circle at 45% 20%, rgba(134,239,172,0.16), transparent 55%), radial-gradient(circle at 70% 60%, rgba(56,189,248,0.1), transparent 65%), linear-gradient(135deg, rgba(8,12,18,0.98), rgba(10,16,22,0.96))",
    lineTexture: "linear-gradient(to bottom, rgba(255,255,255,0.25), rgba(255,255,255,0.08))",
    lineActiveTexture: "linear-gradient(to bottom, rgb(var(--accent) / 0.7), rgb(var(--accent) / 0.15))",
    pulseAnimation: "pulse-fade",
    motionClass: "motion-calm",
  },
];

const toneOptions = ["Clear", "Bold", "Reflective"] as const;

type Tone = (typeof toneOptions)[number];

type PointerState = {
  x: number;
  y: number;
  active: boolean;
  down: boolean;
};

const initialPointer: PointerState = { x: 0.5, y: 0.5, active: false, down: false };

const explorationFragments = [
  { id: "frag-1", label: "field notes", detail: "A smell of rain, a doorway light.", x: 14, y: 18, drift: 9, delay: 0 },
  { id: "frag-2", label: "edge of scene", detail: "Who arrives late. Who is waiting.", x: 58, y: 8, drift: 11, delay: 0.4 },
  { id: "frag-3", label: "recorded sound", detail: "Tin roof, distant laughter.", x: 78, y: 30, drift: 8, delay: 0.2 },
  { id: "frag-4", label: "memory", detail: "The day the river turned.", x: 22, y: 46, drift: 12, delay: 0.3 },
  { id: "frag-5", label: "quiet line", detail: "What the city refuses to say.", x: 66, y: 52, drift: 10, delay: 0.6 },
  { id: "frag-6", label: "shift", detail: "A hinge where the story bends.", x: 38, y: 70, drift: 13, delay: 0.1 },
];

export default function IdeaLifecycleTimeline() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [sparkEngaged, setSparkEngaged] = useState(false);
  const [sparkVariantIndex, setSparkVariantIndex] = useState(0);
  const [sparkFade, setSparkFade] = useState(false);
  const [tone, setTone] = useState<Tone>("Clear");
  const [refineMode, setRefineMode] = useState<"before" | "after">("before");
  const [pointer, setPointer] = useState<PointerState>(initialPointer);
  const [exploreSize, setExploreSize] = useState({ width: 0, height: 0 });
  const stepRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const explorationRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef<PointerState>(initialPointer);
  const rafRef = useRef(0);

  const activePhase = phases[activeIndex];
  const visiblePhase = phases[visibleIndex];

  useEffect(() => {
    if (activeIndex === visibleIndex) return;
    const fade = window.setTimeout(() => setVisibleIndex(activeIndex), 160);
    return () => window.clearTimeout(fade);
  }, [activeIndex, visibleIndex]);

  useEffect(() => {
    if (!sparkEngaged || activePhase.id !== "spark") return;
    const variants = phases[0].questionVariants ?? [];
    if (!variants.length) return;
    let timeoutId: number | null = null;
    const interval = window.setInterval(() => {
      setSparkFade(true);
      timeoutId = window.setTimeout(() => {
        setSparkVariantIndex((prev) => (prev + 1) % variants.length);
        setSparkFade(false);
      }, 240);
    }, 2200);
    return () => {
      window.clearInterval(interval);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [sparkEngaged, activePhase.id]);

  useEffect(() => {
    const elements = stepRefs.current.filter(Boolean) as HTMLButtonElement[];
    if (!elements.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const idx = Number(entry.target.getAttribute("data-step-index"));
          if (Number.isNaN(idx)) return;
          setActiveIndex(idx);
          if (idx !== 3) setRefineMode("before");
          if (idx !== 4) setTone("Clear");
          if (idx !== 0) {
            setSparkEngaged(false);
            setSparkVariantIndex(0);
            setSparkFade(false);
          }
        });
      },
      { threshold: 0.2, rootMargin: "-40% 0px -45% 0px" }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = explorationRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setExploreSize({ width: rect.width, height: rect.height });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    const el = explorationRef.current;
    if (!el) return;

    const schedule = () => {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(() => {
        setPointer({ ...pointerRef.current });
        rafRef.current = 0;
      });
    };

    const handleMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      pointerRef.current = {
        x: Math.min(Math.max(x, 0), 1),
        y: Math.min(Math.max(y, 0), 1),
        active: true,
        down: pointerRef.current.down,
      };
      schedule();
    };

    const handleDown = (event: PointerEvent) => {
      pointerRef.current.down = true;
      handleMove(event);
    };

    const handleUp = () => {
      pointerRef.current.down = false;
      pointerRef.current.active = false;
      schedule();
    };

    el.addEventListener("pointermove", handleMove);
    el.addEventListener("pointerdown", handleDown);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);

    return () => {
      el.removeEventListener("pointermove", handleMove);
      el.removeEventListener("pointerdown", handleDown);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const onStepClick = useCallback((index: number) => {
    setActiveIndex(index);
    setSparkEngaged(index === 0);
    if (index !== 3) setRefineMode("before");
    if (index !== 4) setTone("Clear");
    if (index !== 0) {
      setSparkVariantIndex(0);
      setSparkFade(false);
    }
    const el = stepRefs.current[index];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const progressPercent = useMemo(() => {
    if (phases.length <= 1) return 0;
    return (activeIndex / (phases.length - 1)) * 100;
  }, [activeIndex]);

  return (
    <section
      className="relative border-t border-white/5 bg-slate-950"
      data-phase={activePhase.id}
      style={
        {
          "--accent": activePhase.accent,
          "--accent-soft": activePhase.accentSoft,
        } as CSSProperties
      }
    >
      <div className="absolute inset-0 -z-10 overflow-hidden transition-opacity duration-700">
        <div className="absolute inset-0 atmosphere" style={{ backgroundImage: activePhase.atmosphere }} />
        <div className="absolute inset-0 noise-layer" aria-hidden />
      </div>

      <div className="mx-auto max-w-6xl px-6 py-20 md:px-10">
        <header className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-300/70">Writing Journey</p>
          <h2 className="mt-4 text-3xl font-semibold text-white md:text-4xl">The Writing Journey</h2>
          <p className="mt-3 text-base text-slate-200/70">
            Follow the emotional arc from curiosity to release. Each phase is a different room in the studio.
          </p>
        </header>

        <div className="mt-10 flex gap-3 overflow-x-auto pb-3 lg:hidden">
          {phases.map((phase, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={`pill-${phase.id}`}
                type="button"
                onClick={() => onStepClick(index)}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "border-[rgb(var(--accent))] bg-[rgb(var(--accent)/0.2)] text-[rgb(var(--accent-soft))]"
                    : "border-white/10 bg-white/5 text-slate-200/70"
                }`}
              >
                <span className="text-xs opacity-70">0{index + 1}</span>
                {phase.title}
              </button>
            );
          })}
        </div>

        <div className="mt-6 lg:grid lg:grid-cols-12 lg:gap-8">
          <div className="relative lg:col-span-5">
            {/* Removed vertical timeline guide line */}

            <div className="flex flex-col gap-5">
              {phases.map((phase, index) => {
                const isActive = index === activeIndex;
                return (
                  <button
                    key={phase.id}
                    id={`step-${phase.id}`}
                    type="button"
                    data-step-index={index}
                    aria-label={`Activate ${phase.title} phase`}
                    aria-current={isActive ? "step" : undefined}
                    ref={(el) => {
                      stepRefs.current[index] = el;
                    }}
                    onClick={() => onStepClick(index)}
                    onMouseEnter={() => phase.id === "spark" && setSparkEngaged(true)}
                    onMouseLeave={() => phase.id === "spark" && setSparkEngaged(false)}
                    onFocus={() => phase.id === "spark" && setSparkEngaged(true)}
                    onBlur={() => phase.id === "spark" && setSparkEngaged(false)}
                    className={`group relative w-full rounded-2xl border px-4 py-6 text-left transition duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.6)] ${
                      isActive
                        ? "border-[rgb(var(--accent)/0.7)] bg-white/10 shadow-[0_20px_40px_rgba(15,23,42,0.45)]"
                        : "border-white/10 bg-white/5 hover:border-[rgb(var(--accent)/0.5)] hover:bg-white/10"
                    }`}
                  >
                    <span
                      className={`absolute left-2 top-8 hidden h-3 w-3 rounded-full border lg:block ${
                        isActive
                          ? "border-[rgb(var(--accent))] bg-[rgb(var(--accent))]"
                          : "border-white/20 bg-slate-950"
                      }`}
                      style={{ animation: isActive ? `${phase.pulseAnimation} 2.6s ease-in-out infinite` : "none" }}
                    />
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition ${
                          isActive
                            ? "border-[rgb(var(--accent))] bg-[rgb(var(--accent)/0.18)] text-[rgb(var(--accent-soft))]"
                            : "border-white/20 text-slate-200/80 group-hover:border-[rgb(var(--accent)/0.5)]"
                        }`}
                      >
                        0{index + 1}
                      </span>
                      <div>
                        <p className="text-lg font-semibold text-white">{phase.title}</p>
                        <p className="mt-1 text-sm text-slate-200/70">{phase.microcopy}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400/70">
                      Mood
                      <span className="h-2 w-2 rounded-full bg-[rgb(var(--accent)/0.5)]" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative lg:col-span-7">
            <div className="relative z-20 min-h-[520px] lg:sticky lg:top-24">
              <div
                className={`relative rounded-3xl border border-white/10 bg-slate-950/80 p-6 text-white/95 shadow-2xl backdrop-blur-xl ${activePhase.motionClass}`}
              >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Living Editor</p>
                        <h3 className="mt-2 text-lg font-semibold text-white">{visiblePhase.title}</h3>
                      </div>
                      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))]" />
                        Focus
                      </div>
                    </div>

                    <div className="pointer-events-none absolute right-6 top-8 hidden h-16 w-16 md:block">
                      <div className="relative h-full w-full rounded-full border border-white/10 orbit-ring">
                        <span className="orbit-dot" />
                      </div>
                    </div>

                <div className="mt-5 flex items-center gap-2 text-xs text-slate-200/90">
                  {[
                    { label: "Draft", active: visibleIndex <= 2 },
                    { label: "Notes", active: visibleIndex === 1 || visibleIndex === 3 },
                    { label: "Outline", active: visibleIndex >= 2 && visibleIndex <= 4 },
                  ].map((tab) => (
                    <div
                      key={tab.label}
                      className={`rounded-full px-3 py-1 transition ${
                        tab.active
                          ? "bg-[rgb(var(--accent)/0.25)] text-[rgb(var(--accent-soft))] shadow-[0_0_0_1px_rgba(255,255,255,0.12)]"
                          : "bg-slate-950/80 text-slate-200/80 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                      }`}
                    >
                      {tab.label}
                    </div>
                  ))}
                </div>

                <div
                  className={`mt-6 rounded-2xl border border-white/15 bg-slate-950/85 p-5 backdrop-blur-sm transition-all duration-300 ${
                    activeIndex !== visibleIndex ? "opacity-0 -translate-y-2" : "opacity-100 translate-y-0"
                  }`}
                >
                  <PreviewContent
                    phase={visiblePhase}
                    sparkVariantIndex={sparkVariantIndex}
                    sparkEngaged={sparkEngaged}
                    sparkFade={sparkFade}
                    onSparkEngaged={setSparkEngaged}
                    tone={tone}
                    onToneChange={setTone}
                    refineMode={refineMode}
                    onRefineModeChange={setRefineMode}
                    pointer={pointer}
                    exploreSize={exploreSize}
                    explorationRef={explorationRef}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.35)]">
          <h3 className="text-2xl font-semibold text-white">Start the journey.</h3>
          <p className="mt-2 text-sm text-slate-200/70">Build a writing ritual that moves from curiosity to clarity.</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="/submit"
              className="rounded-full border border-[rgb(var(--accent)/0.6)] bg-[rgb(var(--accent)/0.2)] px-6 py-2 text-sm font-semibold text-[rgb(var(--accent-soft))] transition hover:bg-[rgb(var(--accent)/0.3)]"
            >
              Start an Idea
            </a>
            <a
              href="/feed"
              className="rounded-full border border-white/20 bg-white/5 px-6 py-2 text-sm font-semibold text-white transition hover:border-[rgb(var(--accent)/0.5)] hover:text-[rgb(var(--accent-soft))]"
            >
              Enter the Platform
            </a>
          </div>
        </div>
      </div>

      <style jsx>{`
        .atmosphere {
          opacity: 0.9;
          transition: opacity 0.6s ease, transform 0.8s ease;
          animation: slow-pan 18s ease-in-out infinite;
        }
        .noise-layer {
          background-image: radial-gradient(rgba(255, 255, 255, 0.08) 0.8px, transparent 0.8px);
          background-size: 3px 3px;
          mix-blend-mode: soft-light;
          opacity: 0.25;
        }
        .emotion-line,
        .emotion-line-active {
          background-size: 8px 18px;
          animation: line-flow 6s linear infinite;
        }
        .motion-drift .preview-float {
          animation: drift 8s ease-in-out infinite;
        }
        .motion-chaos .preview-float {
          animation: jitter 1.6s steps(2, end) infinite;
        }
        .motion-snap .preview-lock {
          animation: lock 0.6s ease;
        }
        .motion-precision .preview-focus {
          animation: focus 1.6s ease-in-out infinite;
        }
        .motion-signature .signature-line::after {
          animation: signature 2.8s ease-in-out infinite;
        }
        .motion-calm .preview-calm {
          animation: calm 4s ease-in-out infinite;
        }
        .cursor-blink {
          animation: cursor-blink 1.2s steps(2, end) infinite;
        }
        .spark-glow {
          animation: breathe 4s ease-in-out infinite;
        }
        .overwhelm-bar {
          animation: overwhelm-rise 2.6s ease-in-out infinite;
        }
        .signature-line {
          position: relative;
          display: inline-block;
        }
        .signature-line::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: -6px;
          height: 3px;
          width: 100%;
          background: linear-gradient(90deg, transparent, rgb(var(--accent) / 0.7), transparent);
          border-radius: 999px;
          transform-origin: left;
          transform: scaleX(0.3);
        }
        .orbit-ring {
          box-shadow: 0 0 24px rgba(255, 255, 255, 0.08);
        }
        .orbit-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          height: 6px;
          width: 6px;
          border-radius: 999px;
          background: rgb(var(--accent));
          transform: translate(-50%, -50%);
          animation: orbit 6s linear infinite;
        }
        @keyframes slow-pan {
          0%,
          100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-12px) scale(1.02);
          }
        }
        @keyframes orbit {
          0% {
            transform: translate(-50%, -50%) rotate(0deg) translateX(24px);
          }
          100% {
            transform: translate(-50%, -50%) rotate(360deg) translateX(24px);
          }
        }
        @keyframes line-flow {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 0 120px;
          }
        }
        @keyframes drift {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-6px);
          }
        }
        @keyframes jitter {
          0% {
            transform: translate(0px, 0px);
          }
          50% {
            transform: translate(2px, -2px);
          }
          100% {
            transform: translate(-2px, 2px);
          }
        }
        @keyframes lock {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(0.98);
          }
          100% {
            transform: scale(1);
          }
        }
        @keyframes focus {
          0%,
          100% {
            box-shadow: 0 0 0 rgba(255, 255, 255, 0);
          }
          50% {
            box-shadow: 0 0 18px rgba(255, 255, 255, 0.08);
          }
        }
        @keyframes signature {
          0% {
            transform: scaleX(0.2);
            opacity: 0.3;
          }
          50% {
            transform: scaleX(1);
            opacity: 0.9;
          }
          100% {
            transform: scaleX(0.35);
            opacity: 0.4;
          }
        }
        @keyframes calm {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-4px);
          }
        }
        @keyframes cursor-blink {
          0%,
          100% {
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
        }
        @keyframes breathe {
          0%,
          100% {
            opacity: 0.4;
          }
          50% {
            opacity: 0.85;
          }
        }
        @keyframes overwhelm-rise {
          0%,
          100% {
            transform: scaleX(0.4);
          }
          50% {
            transform: scaleX(0.9);
          }
        }
        @keyframes pulse-breathe {
          0%,
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 rgba(255, 255, 255, 0);
          }
          50% {
            transform: scale(1.25);
            box-shadow: 0 0 12px rgb(var(--accent) / 0.7);
          }
        }
        @keyframes pulse-flicker {
          0%,
          100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
        @keyframes pulse-snap {
          0% {
            transform: scale(1);
          }
          40% {
            transform: scale(1.35);
          }
          100% {
            transform: scale(1);
          }
        }
        @keyframes pulse-steady {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.15);
            opacity: 1;
          }
        }
        @keyframes pulse-warm {
          0%,
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 rgba(255, 255, 255, 0);
          }
          50% {
            transform: scale(1.18);
            box-shadow: 0 0 16px rgb(var(--accent) / 0.5);
          }
        }
        @keyframes pulse-fade {
          0%,
          100% {
            opacity: 0.6;
          }
          50% {
            opacity: 0.3;
          }
        }
      `}</style>
    </section>
  );
}

type PreviewContentProps = {
  phase: Phase;
  sparkVariantIndex: number;
  sparkEngaged: boolean;
  sparkFade: boolean;
  onSparkEngaged: (value: boolean) => void;
  tone: Tone;
  onToneChange: (tone: Tone) => void;
  refineMode: "before" | "after";
  onRefineModeChange: (mode: "before" | "after") => void;
  pointer: PointerState;
  exploreSize: { width: number; height: number };
  explorationRef: RefObject<HTMLDivElement>;
};

function PreviewContent({
  phase,
  sparkVariantIndex,
  sparkEngaged,
  sparkFade,
  onSparkEngaged,
  tone,
  onToneChange,
  refineMode,
  onRefineModeChange,
  pointer,
  exploreSize,
  explorationRef,
}: PreviewContentProps) {
  if (phase.id === "spark") {
    const variants = phase.questionVariants ?? [];
    const currentQuestion = variants[sparkVariantIndex] ?? "A question that won't leave you alone.";
    return (
      <div className="relative space-y-4">
        <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Draft</div>
        <div
          className="relative rounded-2xl border border-white/10 bg-slate-900/60 p-5"
          onMouseEnter={() => onSparkEngaged(true)}
          onMouseLeave={() => onSparkEngaged(false)}
        >
          <div className="absolute inset-0 -z-10 rounded-2xl bg-[radial-gradient(circle_at_center,_rgba(251,191,36,0.25),_transparent_60%)] spark-glow" />
          <p className="text-xl font-medium text-white">
            <span className={`block transition-opacity duration-300 ${sparkFade ? "opacity-0" : "opacity-100"}`}>
              {currentQuestion}
            </span>
            <span className="ml-2 inline-block h-5 w-0.5 bg-[rgb(var(--accent))] align-middle cursor-blink" />
          </p>
          <p className="mt-3 text-sm text-slate-300/70">Hold the line until the shape appears.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className={`h-2 w-2 rounded-full ${sparkEngaged ? "bg-[rgb(var(--accent))]" : "bg-white/20"}`} />
          Morphing prompt engaged
        </div>
      </div>
    );
  }

  if (phase.id === "exploration") {
    return (
      <div className="space-y-4">
        <div ref={explorationRef} className="relative h-52 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50">
          {explorationFragments.map((fragment) => {
            const baseX = fragment.x / 100;
            const baseY = fragment.y / 100;
            const dx = baseX - pointer.x;
            const dy = baseY - pointer.y;
            const dist = Math.hypot(dx, dy) || 1;
            const influence = Math.max(0, 0.25 - dist) / 0.25;
            const repel = (pointer.down ? 1 : pointer.active ? 0.5 : 0) * influence;
            const offsetX = exploreSize.width ? (-dx / dist) * repel * exploreSize.width * 0.08 : 0;
            const offsetY = exploreSize.height ? (-dy / dist) * repel * exploreSize.height * 0.08 : 0;

            return (
              <div
                key={fragment.id}
                className="group absolute rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200/80 shadow-[0_10px_20px_rgba(15,23,42,0.35)] preview-float"
                style={{
                  left: `${fragment.x}%`,
                  top: `${fragment.y}%`,
                  transform: `translate(${offsetX}px, ${offsetY}px)`,
                  animationDelay: `${fragment.delay}s`,
                  animationDuration: `${fragment.drift}s`,
                }}
              >
                <div className="font-semibold text-white">{fragment.label}</div>
                <div className="mt-1 max-w-[160px] text-[11px] text-slate-300/70 opacity-0 transition group-hover:opacity-100">
                  {fragment.detail}
                </div>
              </div>
            );
          })}
          <div className="absolute bottom-3 left-3 flex items-center gap-2 text-[10px] text-slate-400/80">
            Overwhelm meter
            <div className="h-1 w-16 overflow-hidden rounded-full bg-white/10">
              <div className="h-full origin-left rounded-full bg-[rgb(var(--accent))] overwhelm-bar" />
            </div>
          </div>
        </div>
        <p className="text-sm text-slate-300/70">Drag the field and watch the fragments react.</p>
      </div>
    );
  }

  if (phase.id === "structure") {
    return (
      <div className="space-y-4" key={`structure-${phase.id}`}>
        <div className="grid gap-3">
          {["Opening scene", "Context + stakes", "Shift in perspective", "Quiet resolution"].map((item, index) => (
            <div
              key={item}
              className="flex items-center justify-between rounded-xl border border-white/15 bg-slate-900/70 px-4 py-3 text-sm text-slate-200 preview-lock"
              style={{ animationDelay: `${index * 0.06}s` }}
            >
              <span>{item}</span>
              <span className="text-xs text-[rgb(var(--accent))]">{`0${index + 1}`}</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-white/15 bg-slate-900/70 p-4">
          <div className="h-2 w-3/4 rounded-full bg-white/10" />
          <div className="mt-2 h-2 w-2/3 rounded-full bg-white/10" />
          <div className="mt-2 h-2 w-1/2 rounded-full bg-white/10" />
          <div className="mt-4 space-y-2 text-sm text-slate-200/80">
            <p className="transition-all duration-500">Skeleton becomes story.</p>
            <p className="text-xs text-slate-400">The outline locks in with a quiet click.</p>
          </div>
        </div>
      </div>
    );
  }

  if (phase.id === "refinement") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          Clarity score
          <div className="h-1 w-20 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[rgb(var(--accent))] transition-all duration-500"
              style={{ width: refineMode === "after" ? "85%" : "45%" }}
            />
          </div>
        </div>
        <div className="rounded-xl border border-white/15 bg-slate-900/70 p-4 preview-focus">
          <div className="flex gap-2">
            {["Before", "After"].map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => onRefineModeChange(label === "Before" ? "before" : "after")}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  (label === "Before" && refineMode === "before") || (label === "After" && refineMode === "after")
                    ? "border-[rgb(var(--accent))] bg-[rgb(var(--accent)/0.2)] text-[rgb(var(--accent-soft))]"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-[rgb(var(--accent)/0.4)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <p
              className={`text-sm text-slate-300/70 transition-all duration-500 ${
                refineMode === "before" ? "opacity-100" : "opacity-30 line-through"
              }`}
            >
              The streets were quiet and the lights were low.
            </p>
            <p
              className={`mt-2 text-sm transition-all duration-500 ${
                refineMode === "after" ? "opacity-100 text-white" : "opacity-30 text-slate-400"
              }`}
            >
              The streets exhaled, lights dimming as the city held its breath.
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-400">Each edit tightens the pulse.</p>
      </div>
    );
  }

  if (phase.id === "voice") {
    const toneStyles =
      tone === "Clear"
        ? "text-slate-100 tracking-normal leading-relaxed"
        : tone === "Bold"
        ? "text-[rgb(var(--accent-soft))] tracking-wide leading-loose font-semibold"
        : "text-slate-200/80 italic tracking-[0.02em] leading-relaxed";

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {toneOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onToneChange(option)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                tone === option
                  ? "border-[rgb(var(--accent))] bg-[rgb(var(--accent)/0.2)] text-[rgb(var(--accent-soft))]"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-[rgb(var(--accent)/0.4)]"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <p className={`rounded-xl border border-white/15 bg-slate-900/70 p-4 text-sm ${toneStyles}`}>
          The story settles into its own rhythm, unhurried and exact. <span className="signature-line">Now it sounds like you.</span>
        </p>
        <p className="text-xs text-slate-400">Signature underline holds the final cadence.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-white/15 bg-slate-900/70 p-6 text-center preview-calm">
      <p className="text-lg font-semibold text-white">Final draft</p>
      <p className="mt-2 text-sm text-slate-200/70">No rush. You'll know.</p>
      <button
        type="button"
        className="mt-4 rounded-full border border-[rgb(var(--accent)/0.5)] bg-[rgb(var(--accent)/0.2)] px-5 py-2 text-xs font-semibold text-[rgb(var(--accent-soft))]"
      >
        Publish when ready
      </button>
    </div>
  );
}
