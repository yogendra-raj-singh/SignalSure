import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  Bot,
  Eye,
  Link2,
  Lock,
  MessageSquare,
  Pause,
  Play,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'motion/react';
import { BrandMark } from '../components/BrandMark';
import type { AppRoute } from '../components/Navbar';
import { ReportView } from '../components/ReportView';
import { analyzeWithDemoEngine, SAMPLE_CASES } from '../lib/demoAnalyzer';

const SecurityCoreScene = lazy(
  () => import('../components/three/SecurityCoreScene')
);

interface HomePageProps {
  onNavigate: (route: AppRoute) => void;
  onSelectSampleForAnalyzer: (sampleId: string) => void;
}

const CAPABILITY_TABS = [
  {
    id: 'message',
    label: 'Message Analysis',
    cardTitle: 'PROACTIVE PHRASE DETECTION',
    cardDesc:
      'Spot urgent KYC threats, arrest-scam scripts, and manipulation cues inside SMS or WhatsApp forwards.',
    route: '/analyze' as AppRoute,
    Icon: ScanSearch,
  },
  {
    id: 'upi',
    label: 'UPI & QR Checks',
    cardTitle: 'PAYMENT COLLECT GUARD',
    cardDesc:
      'Distinguish real incoming credits from malicious collect requests or PIN-for-refund deception.',
    route: '/learn' as AppRoute,
    Icon: ShieldAlert,
  },
  {
    id: 'links',
    label: 'Link Inspection',
    cardTitle: 'LOOKALIKE DOMAIN TRIAGE',
    cardDesc:
      'Inspect shortened URLs, suspicious top-level domains, and spoofed banking subdomains before tapping.',
    route: '/analyze' as AppRoute,
    Icon: Link2,
  },
  {
    id: 'recovery',
    label: 'Post-Click Recovery',
    cardTitle: 'CALM RESPONSE PLAYBOOK',
    cardDesc:
      'Guided bank freeze steps, 1930 helpline triage, and Sanchar Saathi Chakshu reporting checklists.',
    route: '/assistant' as AppRoute,
    Icon: ShieldCheck,
  },
] as const;

const THREAT_VECTORS = [
  {
    index: '01',
    title: 'UPI & PAYMENT FRAUD',
    desc: 'Detect collect-request traps, fake refund QR codes, and merchant impersonation before entering your PIN.',
    image: '/src/assets/images/threat_upi_fraud_1795619457023.jpg',
    alt: 'Stylized portrait overlaid with cyan digital verification streams representing UPI payment protection',
    route: '/learn' as AppRoute,
  },
  {
    index: '02',
    title: 'KYC IMPERSONATION',
    desc: 'Spot forged bank, electricity, and courier suspension notices pressuring immediate account verification.',
    image: '/src/assets/images/threat_kyc_cloud_1795619459016.jpg',
    alt: 'Dramatic teal electric cloud motif symbolizing disguised impersonation messages',
    route: '/analyze' as AppRoute,
  },
  {
    index: '03',
    title: 'FAKE JOB & TASK SCAMS',
    desc: 'Identify prepaid rating tasks, Telegram deposit tiers, and spoofed corporate recruiter offers.',
    image: '/src/assets/images/threat_job_identity_1795619458377.jpg',
    alt: 'Futuristic cyber visor helmet representing guarded identity against fake task and recruiter offers',
    route: '/learn' as AppRoute,
  },
  {
    index: '04',
    title: 'PHISHING & RECOVERY',
    desc: 'Inspect deceptive links safely and follow immediate India 1930 escalation if a tap already happened.',
    image: '/src/assets/images/threat_phishing_response_1795619458889.jpg',
    alt: 'Analyst inspecting illuminated threat telemetry for rapid incident response and recovery',
    route: '/report' as AppRoute,
  },
] as const;

const HERO_BAR_HEIGHTS = [38, 62, 48, 72, 68, 86, 60, 44];

// 12 cols x 5 rows pattern forming an abstract verification matrix
const MATRIX_PATTERN = [
  [0, 0, 0, 1, 1, 2, 1, 1, 0, 0, 0, 0],
  [0, 1, 2, 2, 1, 2, 2, 1, 2, 1, 0, 0],
  [1, 2, 2, 1, 2, 2, 1, 2, 2, 2, 1, 0],
  [0, 1, 2, 2, 2, 1, 2, 2, 1, 2, 1, 1],
  [0, 0, 1, 1, 2, 2, 1, 1, 2, 1, 0, 0],
];

export function HomePage({
  onNavigate,
  onSelectSampleForAnalyzer,
}: HomePageProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [userMotionOverride, setUserMotionOverride] = useState<boolean | null>(
    null
  );
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [previewSampleId, setPreviewSampleId] = useState<string>(
    SAMPLE_CASES[0].id
  );
  const cutoutParallaxRef = useRef<HTMLDivElement>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [failedThreats, setFailedThreats] = useState<Record<string, boolean>>(
    {}
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const reducedMotion =
    userMotionOverride !== null ? userMotionOverride : prefersReducedMotion;

  useEffect(() => {
    if (reducedMotion && cutoutParallaxRef.current) {
      cutoutParallaxRef.current.style.transform = 'translate3d(0px, 0px, 0)';
    }
  }, [reducedMotion]);

  const previewSample = useMemo(
    () =>
      SAMPLE_CASES.find((c) => c.id === previewSampleId) ?? SAMPLE_CASES[0],
    [previewSampleId]
  );

  const previewReport = useMemo(
    () => analyzeWithDemoEngine(previewSample.content, previewSample.inputKind),
    [previewSample]
  );

  const handleHeroPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (reducedMotion || typeof window === 'undefined' || !cutoutParallaxRef.current) return;
    if (window.innerWidth < 1024) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, ((e.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1));
    cutoutParallaxRef.current.style.transform = `translate3d(${(nx * 8).toFixed(1)}px, ${(ny * 5).toFixed(1)}px, 0)`;
  };

  const handleHeroPointerLeave = () => {
    if (cutoutParallaxRef.current) {
      cutoutParallaxRef.current.style.transform = 'translate3d(0px, 0px, 0)';
    }
  };

  // Map 4 capability tabs to their grid column indices (skipping index 2 which hosts the 3D core)
  const tabColPositions = [0, 1, 3, 4];
  const activeColIndex = tabColPositions[activeTabIdx] ?? 0;

  return (
    <div className="bg-[#030808] text-[#F1F7F6]">
      {/* SECTION 1: Hero with Monochrome Person Cutout & Telemetry-style Sample Panels */}
      <section
        onPointerMove={handleHeroPointerMove}
        onPointerLeave={handleHeroPointerLeave}
        className="relative overflow-hidden border-b border-white/10 bg-[#030808]"
      >
        {/* Radial Emerald Ambient Illumination */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 68% 72% at 50% 45%, rgba(0, 240, 200, 0.16) 0%, rgba(10, 48, 43, 0.36) 40%, #030808 78%)',
          }}
        />

        {/* Subtle Architectural Grid Overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
          }}
        />

        <div className="relative mx-auto max-w-[1320px] px-4 pb-12 pt-8 sm:px-6 lg:min-h-[700px] lg:px-8 lg:pb-14 lg:pt-10">
          {/* Colossal Wide Cyber Headline spanning top behind/around cutout crown */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.55 }}
            className="relative z-10 text-center"
          >
            <h1 className="font-cyber text-[clamp(1.45rem,6vw,5.15rem)] leading-[1.02] tracking-[0.03em] text-white uppercase select-none">
              <span className="block">TRUST LESS.</span>
              <span className="mt-1.5 block text-[#7B918E]">VERIFY MORE.</span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#A3B8B5] sm:text-base lg:hidden">
              Understand suspicious messages, links and offers before you act.
            </p>
          </motion.div>

          {/* 3-Zone Responsive Stage: Left Editorial | Center Person Cutout | Right Cards + CTA */}
          <div className="relative z-20 mt-6 grid items-end gap-8 lg:-mt-20 lg:grid-cols-12 lg:gap-4">
            {/* LEFT FLANK */}
            <div className="order-2 min-w-0 flex flex-col justify-between gap-10 lg:order-1 lg:col-span-3 lg:pb-4 lg:pt-28">
              <div className="flex items-center gap-4">
                <div>
                  <p className="font-cyber text-2xl font-normal tracking-wider text-white">
                    1930
                  </p>
                  <p className="mt-0.5 text-[10px] font-medium tracking-[0.14em] text-[#7E9692] uppercase">
                    India Cyber Helpline
                  </p>
                </div>
                <div
                  className="flex items-center -space-x-2"
                  aria-hidden="true"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-[#0A1715] text-[#00F0C8]">
                    <MessageSquare className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-[#0A1715] text-[#8CEEE0]">
                    <Link2 className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-[#0A1715] text-amber-300">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>

              <div>
                {/* Animated Signal Burst Visual Thumbnail matching reference bottom-left cue */}
                <div
                  aria-hidden="true"
                  className="mb-4 flex h-16 w-40 items-center justify-center overflow-hidden border border-white/10 bg-[#040B0A] px-3"
                >
                  <svg viewBox="0 0 140 54" className="h-full w-full" fill="none">
                    <circle cx="70" cy="46" r="4" fill="#00F0C8" />
                    {Array.from({ length: 13 }).map((_, idx) => {
                      const angle = -Math.PI + (idx / 12) * Math.PI;
                      const r = idx % 2 === 0 ? 38 : 28;
                      const x2 = 70 + Math.cos(angle) * r * 1.45;
                      const y2 = 46 + Math.sin(angle) * r;
                      const stroke =
                        idx % 4 === 0
                          ? '#F59E0B'
                          : idx % 3 === 0
                          ? '#00F0C8'
                          : '#9CF5E6';
                      return (
                        <line
                          key={idx}
                          x1="70"
                          y1="46"
                          x2={x2.toFixed(1)}
                          y2={y2.toFixed(1)}
                          stroke={stroke}
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                          className={reducedMotion ? '' : 'ss-animate-pulse-cell'}
                          style={{ animationDelay: `${idx * 140}ms` }}
                        />
                      );
                    })}
                  </svg>
                </div>

                <p className="max-w-xs text-xs leading-relaxed tracking-[0.06em] text-[#D7E8E5] uppercase">
                  Understand suspicious messages, links and offers before you act.{' '}
                  <span className="text-[#788E8B]">
                    AI-assisted verification built for India with zero credential
                    collection.
                  </span>
                </p>
              </div>
            </div>

            {/* CENTER PERSON CUTOUT WITH + MATRIX PROJECTION & SCAN SWEEP */}
            <div className="order-1 min-w-0 flex justify-center lg:order-2 lg:col-span-6">
              <motion.div
                ref={cutoutParallaxRef}
                initial={reducedMotion ? false : { opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: reducedMotion ? 0 : 0.7 }}
                style={{
                  transition: 'transform 180ms ease-out',
                }}
                className="relative flex h-[340px] w-full max-w-[440px] items-end justify-center sm:h-[450px] lg:h-[570px]"
              >
                {/* Radial mint aura directly behind shoulders/neck */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-6 h-72 w-72 rounded-full opacity-55 blur-3xl"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(0, 240, 200, 0.28) 0%, transparent 70%)',
                  }}
                />

                {!heroImgFailed ? (
                  <img
                    src="/src/assets/images/hero_front_bust_1795619801349.jpg"
                    alt="Front-facing monochrome bust illuminated by an emerald verification grid representing digital threat screening"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="relative z-10 h-full w-auto max-w-full object-contain object-bottom contrast-125 brightness-105 mix-blend-screen select-none"
                    style={{
                      maskImage:
                        'radial-gradient(ellipse 68% 76% at 50% 48%, black 44%, transparent 82%)',
                      WebkitMaskImage:
                        'radial-gradient(ellipse 68% 76% at 50% 48%, black 44%, transparent 82%)',
                    }}
                  />
                ) : (
                  <div
                    data-testid="hero-portrait-fallback"
                    className="relative z-10 flex h-80 w-64 items-center justify-center border border-[#00F0C8]/30 bg-[#051210]"
                  >
                    <ShieldCheck className="h-16 w-16 text-[#00F0C8]" />
                  </div>
                )}

                {/* Animated subtle laser scan sweep across the cutout */}
                {!reducedMotion && (
                  <div
                    aria-hidden="true"
                    className="ss-animate-scan pointer-events-none absolute inset-x-12 top-12 z-20 h-14"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent 0%, rgba(0, 240, 200, 0.16) 50%, transparent 100%)',
                      maskImage:
                        'linear-gradient(90deg, transparent 0%, black 25%, black 75%, transparent 100%)',
                      WebkitMaskImage:
                        'linear-gradient(90deg, transparent 0%, black 25%, black 75%, transparent 100%)',
                    }}
                  />
                )}

                {/* Bottom obsidian dissolve fade */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-20 bg-gradient-to-t from-[#030808] to-transparent"
                />
              </motion.div>
            </div>

            {/* RIGHT FLANK: 2 TRANSLUCENT HUD CARDS + PRIMARY CTA */}
            <div className="order-3 min-w-0 flex flex-col gap-3.5 lg:col-span-3 lg:pb-4 lg:pt-10">
              {/* Card 1: Illustrative Pattern Guide Bar Chart */}
              <div className="border border-white/10 bg-[#0B1716]/85 p-4">
                <div className="flex items-center justify-between text-[10px] tracking-[0.14em] uppercase">
                  <span className="font-semibold text-[#D6E8E4]">
                    Sample Scam Patterns
                  </span>
                  <span className="font-mono text-[#00F0C8]">Example Data</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 border-b border-white/10 pb-3">
                  <div>
                    <p className="text-[10px] text-[#78908C]">Risk Tiers</p>
                    <p className="mt-0.5 font-cyber text-lg text-white">
                      4 Levels
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#78908C]">Secrets Stored</p>
                    <p className="mt-0.5 font-cyber text-lg text-white">
                      Zero PII
                    </p>
                  </div>
                </div>

                <div
                  aria-hidden="true"
                  className="mt-3 flex h-14 items-end gap-2"
                >
                  {HERO_BAR_HEIGHTS.map((pct, i) => (
                    <div
                      key={i}
                      className="flex h-full flex-1 flex-col justify-end bg-[#152825]/60"
                    >
                      <div
                        className={`w-full transition-all duration-500 ${
                          i % 2 === 1 ? 'bg-[#00F0C8]' : 'bg-[#8AEFE0]'
                        } ${reducedMotion ? '' : 'ss-animate-pulse-cell'}`}
                        style={{
                          height: `${pct}%`,
                          animationDelay: `${i * 190}ms`,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 2: Detection Modules Matrix Grid */}
              <div className="border border-white/10 bg-[#0B1716]/85 p-4">
                <div className="flex items-center justify-between text-[10px] tracking-[0.14em] uppercase">
                  <span className="font-semibold text-[#D6E8E4]">
                    Detection Scope
                  </span>
                  <span className="font-mono text-[#7E9692]">6 Modules</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 pb-3">
                  <div>
                    <p className="text-[10px] text-[#78908C]">Channels</p>
                    <p className="mt-0.5 font-cyber text-base text-white">
                      SMS · URL
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#78908C]">Assessment</p>
                    <p className="mt-0.5 font-cyber text-base text-white">
                      AI + Demo
                    </p>
                  </div>
                </div>

                <div
                  aria-hidden="true"
                  className="grid grid-cols-12 gap-1"
                >
                  {MATRIX_PATTERN.flatMap((row, rIdx) =>
                    row.map((val, cIdx) => (
                      <span
                        key={`${rIdx}-${cIdx}`}
                        className={`h-2.5 w-full rounded-[1px] ${
                          val === 2
                            ? 'bg-[#00F0C8]'
                            : val === 1
                            ? 'bg-[#5FD9C3]/75'
                            : 'bg-[#172826]'
                        } ${
                          val > 0 && !reducedMotion ? 'ss-animate-pulse-cell' : ''
                        }`}
                        style={{
                          animationDelay: `${(rIdx * 12 + cIdx) * 45}ms`,
                        }}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Primary & Secondary CTAs */}
              <div className="pt-2 lg:text-right">
                <p className="font-cyber text-xs tracking-[0.14em] text-white uppercase">
                  AI-Assisted
                </p>
                <p className="font-cyber text-xs tracking-[0.14em] text-[#7C9390] uppercase">
                  Scam Analysis
                </p>

                <div className="mt-3 flex flex-col gap-2.5 lg:items-end">
                  <button
                    type="button"
                    onClick={() => onNavigate('/analyze')}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-[2px] bg-[#00F0C8] px-5 py-2.5 text-xs font-semibold tracking-wider text-[#031411] uppercase transition-colors duration-150 hover:bg-[#3BF7D8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00F0C8] sm:w-auto"
                  >
                    Analyze a message
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>

                  <div className="flex flex-wrap items-center justify-between gap-3 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => onNavigate('/learn')}
                      className="inline-flex min-h-9 items-center gap-1.5 text-xs font-medium text-[#A3B8B5] underline-offset-4 hover:text-[#00F0C8] hover:underline"
                    >
                      Explore safety guide
                    </button>

                    <button
                      type="button"
                      onClick={() => setUserMotionOverride(!reducedMotion)}
                      aria-pressed={reducedMotion}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-[2px] border border-white/15 bg-[#071010] px-2.5 py-1 text-[11px] font-medium text-[#A3B8B5] transition-colors hover:border-[#00F0C8]/50 hover:text-white"
                    >
                      {reducedMotion ? (
                        <>
                          <Play
                            className="h-3 w-3 text-[#00F0C8]"
                            aria-hidden="true"
                          />
                          Resume 3D motion
                        </>
                      ) : (
                        <>
                          <Pause
                            className="h-3 w-3 text-[#00F0C8]"
                            aria-hidden="true"
                          />
                          Reduced motion
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Interactive Capability Strip + Live 3D Security Core Centerpiece */}
      <section className="mx-auto max-w-[1320px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-cyber text-2xl tracking-[0.06em] text-white uppercase sm:text-4xl">
            <span className="block">Need to verify</span>
            <span className="mt-1 block text-[#6E8380]">
              suspicious messages
            </span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-[#92A8A4] sm:text-base">
            Slow down high-pressure requests and inspect suspicious SMS, UPI
            collect lures, fake job offers, and unverified URLs in one focused
            workflow.
          </p>

          {/* 4 Corner-Bracketed Interactive Tabs */}
          <div
            role="tablist"
            aria-label="Verification capabilities"
            className="mt-7 flex flex-wrap items-center justify-center gap-3"
          >
            {CAPABILITY_TABS.map((tab, idx) => {
              const selected = idx === activeTabIdx;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveTabIdx(idx)}
                  className={`relative min-h-10 whitespace-nowrap rounded-[2px] px-4 py-2 text-xs font-medium tracking-wide transition-colors ${
                    selected
                      ? 'bg-[#00F0C8] font-semibold text-[#031411]'
                      : 'border border-white/10 bg-[#050C0C] text-[#9EB5B1] hover:border-[#00F0C8]/40 hover:text-white'
                  }`}
                >
                  {!selected && (
                    <>
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-0 top-0 h-1.5 w-1.5 border-l border-t border-white/35"
                      />
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute bottom-0 right-0 h-1.5 w-1.5 border-b border-r border-white/35"
                      />
                    </>
                  )}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5-Column Interconnected Architecture with Live Three.js Core in Center */}
        <div className="mt-10 grid grid-cols-1 border border-white/10 bg-[#040A0A] sm:grid-cols-2 lg:grid-cols-5">
          {([0, 1, 'core', 2, 3] as const).map((slot, colIdx) => {
            if (slot === 'core') {
              return (
                <div
                  key="security-core-slot"
                  className="relative flex min-h-[270px] flex-col justify-between overflow-hidden border-b border-white/10 bg-[#030808] sm:col-span-2 lg:col-span-1 lg:border-b-0 lg:border-r"
                >
                  <div className="relative h-[235px] w-full">
                    <Suspense
                      fallback={
                        <div
                          data-testid="security-core-loading"
                          className="flex h-full w-full items-center justify-center bg-[#030808] text-xs text-[#7E9692]"
                        >
                          Initializing 3D core...
                        </div>
                      }
                    >
                      <SecurityCoreScene
                        reducedMotion={reducedMotion}
                        centered
                      />
                    </Suspense>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 bg-[#040B0B] px-3 py-2 text-[10px] tracking-wider text-[#90A6A2] uppercase">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 bg-[#00F0C8]" />
                      Safe
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 bg-amber-400" />
                      Caution
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 bg-rose-400" />
                      Blocked
                    </span>
                  </div>
                </div>
              );
            }

            const tab = CAPABILITY_TABS[slot];
            const isHighlighted = colIdx === activeColIndex;
            const CardIcon = tab.Icon;

            return (
              <div
                key={tab.id}
                onMouseEnter={() => setActiveTabIdx(slot)}
                className={`group relative flex min-h-[270px] flex-col justify-between border-b border-white/10 p-5 transition-all duration-300 lg:border-b-0 lg:border-r lg:last:border-r-0`}
                style={
                  isHighlighted
                    ? {
                        background:
                          'linear-gradient(155deg, rgba(0, 240, 200, 0.34) 0%, rgba(11, 34, 31, 0.58) 46%, #050C0B 88%)',
                      }
                    : undefined
                }
              >
                <div>
                  <div
                    className={`flex h-9 w-9 items-center justify-center border ${
                      isHighlighted
                        ? 'border-[#00F0C8]/50 bg-[#00F0C8]/15 text-[#00F0C8]'
                        : 'border-white/15 bg-[#091312] text-[#A3B8B5]'
                    }`}
                  >
                    <CardIcon className="h-4 w-4" aria-hidden="true" />
                  </div>

                  <h3 className="mt-10 font-cyber text-xs leading-snug tracking-[0.06em] text-white uppercase">
                    {tab.cardTitle}
                  </h3>
                  <div className="my-3 h-px w-full bg-white/10" />
                  <p className="text-xs leading-relaxed text-[#9DB3AF]">
                    {tab.cardDesc}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onNavigate(tab.route)}
                    aria-label={`Explore ${tab.label}`}
                    className="inline-flex min-h-9 items-center gap-1.5 text-[11px] font-medium text-[#00F0C8] hover:underline"
                  >
                    Open tool
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate(tab.route)}
                    aria-label={`Go to ${tab.cardTitle}`}
                    className="inline-flex h-8 w-8 items-center justify-center border border-white/10 text-[#9FB5B2] transition-colors hover:border-[#00F0C8] hover:text-[#00F0C8]"
                  >
                    <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: 4-Column Threat Vector Showcase */}
      <section className="mx-auto max-w-[1320px] px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-cyber text-2xl tracking-[0.06em] text-white uppercase sm:text-4xl">
            <span className="block">
              One platform{' '}
              <span className="text-[#6E8380]">every</span>
            </span>
            <span className="mt-1 block text-[#6E8380]">
              scam tactic exposed
            </span>
          </h2>
          <p className="text-xs leading-relaxed text-[#92A8A4] sm:text-right sm:text-sm">
            Calm verification.
            <br />
            No guesswork. No panic.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 border border-white/10 bg-[#040A0A] sm:grid-cols-2 lg:grid-cols-4">
          {THREAT_VECTORS.map((item) => {
            const failed = Boolean(failedThreats[item.index]);
            return (
              <article
                key={item.index}
                className="flex flex-col justify-between border-b border-white/10 sm:even:border-l lg:border-b-0 lg:border-r lg:last:border-r-0"
              >
                <div>
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#061211]">
                    {!failed ? (
                      <img
                        src={item.image}
                        alt={item.alt}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedThreats((prev) => ({
                            ...prev,
                            [item.index]: true,
                          }))
                        }
                        className="h-full w-full object-cover object-center transition-transform duration-500 hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0B2320] to-[#040B0B] text-xs font-mono text-[#00F0C8]">
                        {item.title}
                      </div>
                    )}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#040A0A] to-transparent"
                    />
                  </div>

                  <div className="p-5">
                    <h3 className="font-cyber text-xs tracking-[0.06em] text-white uppercase">
                      {item.title}
                    </h3>
                    <p className="mt-2.5 text-xs leading-relaxed text-[#8CA39F]">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between px-5 pb-5 pt-2">
                  <span className="font-mono text-xs font-medium text-[#00F0C8]">
                    {item.index}
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate(item.route)}
                    aria-label={`Open guide for ${item.title}`}
                    className="inline-flex h-8 w-8 items-center justify-center border border-white/10 bg-[#081212] text-[#9FB5B2] transition-colors hover:border-[#00F0C8] hover:text-[#00F0C8]"
                  >
                    <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* SECTION 4: Interactive Sample Report + Bento Grid */}
      <section className="mx-auto max-w-[1320px] px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
        {/* Top Bento Row: Sample Analysis Preview (7 cols) + Prioritized Signals (5 cols) */}
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="min-w-0 border border-white/10 bg-[#060D0D] p-5 sm:p-6 lg:col-span-7">
            <div className="flex flex-col gap-4">
              <div>
                <p className="font-mono text-[11px] tracking-wider text-amber-300 uppercase">
                  Example Demo Preview
                </p>
                <h2 className="mt-1.5 font-cyber text-xl tracking-wide text-white uppercase">
                  Inspect a structured report
                </h2>
              </div>

              <div
                role="tablist"
                aria-label="Sample analysis scenarios"
                className="flex flex-wrap gap-2"
              >
                {SAMPLE_CASES.slice(0, 3).map((sample) => {
                  const selected = sample.id === previewSample.id;
                  return (
                    <button
                      key={sample.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setPreviewSampleId(sample.id)}
                      className={`min-h-9 rounded-[2px] border px-3 py-1.5 text-left text-xs font-medium transition-colors ${
                        selected
                          ? 'border-[#00F0C8] bg-[#00F0C8]/15 text-[#00F0C8]'
                          : 'border-white/10 bg-[#040A0A] text-[#9AB1AD] hover:border-white/25 hover:text-white'
                      }`}
                    >
                      {sample.title}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 border border-white/10 bg-[#030808] p-3.5">
              <div className="flex items-center justify-between text-[11px] text-[#78908C]">
                <span>Sample excerpt · {previewSample.channel}</span>
                <span>Illustrative example</span>
              </div>
              <p className="mt-2 font-mono text-xs leading-relaxed text-[#D7E8E5] [overflow-wrap:anywhere]">
                {previewSample.content}
              </p>
            </div>

            <div className="mt-4">
              <ReportView report={previewReport} compact />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[#7E9692]">
                Results are AI-assisted indicators, never proof of fraud or safety.
              </p>
              <button
                type="button"
                onClick={() => {
                  onSelectSampleForAnalyzer(previewSample.id);
                  onNavigate('/analyze');
                }}
                className="inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-[2px] bg-[#00F0C8] px-4 py-2 text-xs font-semibold tracking-wider text-[#031411] uppercase transition-colors hover:bg-[#3BF7D8]"
              >
                Open in full Analyzer
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Top-Right Bento Card: Prioritized Not Piled Up */}
          <div className="min-w-0 flex flex-col justify-between border border-white/10 bg-[#060D0D] p-5 sm:p-6 lg:col-span-5">
            <div>
              <p className="font-mono text-[11px] tracking-wider text-[#00F0C8] uppercase">
                Observed Signals · Sample Breakdown
              </p>

              <div className="mt-5 space-y-2.5">
                {previewReport.observedEvidence.slice(0, 3).map((ev, i) => (
                  <div
                    key={`${ev.indicatorType}-${i}`}
                    className="flex items-center justify-between gap-3 border border-white/10 bg-[#0A1312] p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`shrink-0 border px-2.5 py-1 text-[11px] font-semibold ${
                          ev.severity === 'critical'
                            ? 'border-rose-500/35 bg-rose-950/40 text-rose-300'
                            : ev.severity === 'high'
                            ? 'border-amber-500/35 bg-amber-950/40 text-amber-300'
                            : 'border-[#00F0C8]/35 bg-[#051F1B] text-[#00F0C8]'
                        }`}
                      >
                        {ev.severity === 'critical'
                          ? 'Critical'
                          : ev.severity === 'high'
                          ? 'High'
                          : 'Caution'}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-cyber text-[11px] tracking-wide text-white uppercase">
                          {ev.indicatorType}
                        </p>
                        <p className="truncate font-mono text-[11px] text-[#7F9793]">
                          “{ev.quotedPhrase}”
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] text-[#78908C]">
                      Quoted
                    </span>
                  </div>
                ))}

                {/* Softly faded 4th reference row matching screenshot visual */}
                <div className="flex items-center justify-between gap-3 border border-white/5 bg-[#070E0D]/70 p-3 opacity-55">
                  <div className="flex items-center gap-3">
                    <span className="border border-white/10 bg-[#0B1715] px-2.5 py-1 text-[11px] text-[#8FA8A4]">
                      Scope
                    </span>
                    <div>
                      <p className="font-cyber text-[11px] text-[#9CB3AF] uppercase">
                        Unverified claims flagged
                      </p>
                      <p className="text-[11px] text-[#657C78]">
                        Text syntax alone cannot prove authenticity
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-white/10 pt-5">
              <h3 className="font-cyber text-base tracking-[0.06em] text-white uppercase">
                Prioritized not piled up
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#8CA39F] sm:text-sm">
                Every risk tier surfaces exact quoted phrases ranked by warning
                severity alongside explicit gaps that need independent confirmation.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bento Row: 3 Cards matching screenshot 4 */}
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          {/* Card 1: Privacy-First by Design */}
          <div className="flex flex-col justify-between border border-white/10 bg-[#060D0D] p-6">
            <div className="relative flex min-h-[180px] flex-col items-center justify-center">
              <div className="w-full max-w-[260px] border border-white/10 bg-[#091211] p-3 opacity-55">
                <div className="flex items-center justify-between text-[10px] text-[#7E9692]">
                  <span>CREDENTIAL GUARD</span>
                  <span>ACTIVE</span>
                </div>
                <p className="mt-1.5 text-xs text-[#9DB3AF]">
                  OTP & PIN warning check
                </p>
              </div>
              <div className="-mt-3 w-full max-w-[290px] border border-white/15 bg-[#101C1B] p-4 shadow-lg">
                <div className="flex items-center justify-between text-[10px] font-mono text-[#00F0C8]">
                  <span>ZERO STORAGE</span>
                  <span>EPHEMERAL</span>
                </div>
                <div className="mt-2.5 flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#00F0C8]/30 bg-[#051815] text-[#00F0C8]">
                    <Lock className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      No OTPs, PINs, or CVVs
                    </p>
                    <p className="text-[11px] text-[#8CA39F]">
                      Submissions screened locally first
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-cyber text-sm tracking-[0.06em] text-white uppercase">
                Privacy-first by design
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#8CA39F]">
                Checking a suspicious SMS never exposes sensitive accounts.
                Automatic alerts catch accidental card or OTP patterns before
                analysis.
              </p>
            </div>
          </div>

          {/* Card 2: Connected Workflows (Integrations Hub Diagram) */}
          <div className="flex flex-col justify-between border border-white/10 bg-[#060D0D] p-6">
            <div>
              <h3 className="font-cyber text-sm tracking-[0.06em] text-white uppercase">
                Connected SignalSure Stack
              </h3>

              <div className="relative my-6 flex h-[175px] items-center justify-center">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 320 175"
                  className="absolute inset-0 h-full w-full"
                  fill="none"
                >
                  <path d="M56 38 L130 88" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
                  <path d="M40 88 L130 88" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
                  <path d="M56 138 L130 88" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
                  <path d="M264 38 L190 88" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
                  <path d="M280 88 L190 88" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
                  <path d="M264 138 L190 88" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
                </svg>

                {/* Left side nodes */}
                <span className="absolute left-3 top-4 border border-white/15 bg-[#0C1716] px-2.5 py-1 font-mono text-[10px] text-[#C8DCD8]">
                  Gemini AI
                </span>
                <span className="absolute left-1 top-[74px] border border-white/15 bg-[#0C1716] px-2.5 py-1 font-mono text-[10px] text-[#C8DCD8]">
                  Botpress
                </span>
                <span className="absolute left-3 bottom-4 border border-white/15 bg-[#0C1716] px-2.5 py-1 font-mono text-[10px] text-[#C8DCD8]">
                  Sheets
                </span>

                {/* Central SignalSure glowing mark */}
                <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-[4px] bg-[#00F0C8] text-[#031411] shadow-[0_0_28px_rgba(0,240,200,0.35)]">
                  <BrandMark className="h-7 w-7 text-[#031411]" />
                </div>

                {/* Right side nodes */}
                <span className="absolute right-3 top-4 border border-white/15 bg-[#0C1716] px-2.5 py-1 font-mono text-[10px] text-[#C8DCD8]">
                  Zapier
                </span>
                <span className="absolute right-1 top-[74px] border border-amber-400/30 bg-[#14170E] px-2.5 py-1 font-mono text-[10px] text-amber-300">
                  1930
                </span>
                <span className="absolute right-3 bottom-4 border border-[#00F0C8]/30 bg-[#061815] px-2.5 py-1 font-mono text-[10px] text-[#00F0C8]">
                  Chakshu
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-4 text-xs">
              <span className="text-[#8CA39F]">
                Live connectors & demo parity
              </span>
              <button
                type="button"
                onClick={() => onNavigate('/about')}
                className="font-medium text-[#00F0C8] hover:underline"
              >
                View status
              </button>
            </div>
          </div>

          {/* Card 3: Calm Escalation Path with Glowing Mint Curve */}
          <div className="flex flex-col justify-between border border-white/10 bg-[#060D0D] p-6">
            <div className="relative h-[185px] overflow-hidden">
              <svg
                aria-hidden="true"
                viewBox="0 0 320 175"
                className="h-full w-full"
                fill="none"
              >
                <defs>
                  <radialGradient id="ssCurveGlow" cx="58%" cy="48%" r="32%">
                    <stop offset="0%" stopColor="rgba(0, 240, 200, 0.34)" />
                    <stop offset="100%" stopColor="rgba(0, 240, 200, 0)" />
                  </radialGradient>
                </defs>
                <rect width="320" height="175" fill="url(#ssCurveGlow)" />
                {/* Ascending reference line */}
                <path
                  d="M28 144 C76 144, 108 106, 152 108 C196 110, 212 36, 286 16"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="1.5"
                />
                {/* Highlighted glowing trajectory up to the active checkpoint */}
                <path
                  d="M28 144 C76 144, 108 106, 152 108 C178 109, 192 86, 202 72"
                  stroke="#00F0C8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="202" cy="72" r="14" fill="rgba(0, 240, 200, 0.18)" />
                <circle cx="202" cy="72" r="5" fill="#00F0C8" />
                <g className="font-mono text-[10px]" fill="#4A5E5B">
                  <text x="26" y="102">PAUSE</text>
                  <text x="92" y="102">VERIFY</text>
                  <text x="164" y="102">FREEZE</text>
                  <text x="234" y="102">1930</text>
                </g>
              </svg>
            </div>

            <div className="mt-4">
              <h3 className="font-cyber text-sm tracking-[0.06em] text-white uppercase">
                Calm escalation path
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#8CA39F]">
                If you tapped a link or lost funds, jump straight to calm
                recovery guidance or submit a sanitized incident pattern.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => onNavigate('/assistant')}
                  className="inline-flex min-h-9 items-center gap-1.5 border border-white/15 bg-[#091413] px-3 py-1.5 font-medium text-white hover:border-[#00F0C8] hover:text-[#00F0C8]"
                >
                  <Bot className="h-3.5 w-3.5 text-[#00F0C8]" aria-hidden="true" />
                  Safety Assistant
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('/report')}
                  className="inline-flex min-h-9 items-center gap-1.5 border border-white/10 px-3 py-1.5 font-medium text-[#A3B8B5] hover:border-white/30 hover:text-white"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  Report incident
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
