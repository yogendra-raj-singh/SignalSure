import {
  CheckCircle2,
  FileSearch,
  Globe,
  Link2,
  Loader2,
  Radar,
  ShieldCheck,
} from 'lucide-react';
import {
  computeScanProgressPercent,
  getActiveScanStageIndex,
  MINIMUM_SCAN_DURATION_MS,
  type ScanStageDefinition,
} from '../lib/analysisTimeline';

interface AnalysisScanProgressProps {
  stages: ScanStageDefinition[];
  elapsedMs: number;
  engineMode: 'live' | 'demo';
}

function getStageIcon(stageId: string) {
  switch (stageId) {
    case 'parse':
      return FileSearch;
    case 'link':
      return Link2;
    case 'web':
      return Globe;
    case 'psychology':
      return Radar;
    case 'gaps':
    case 'compile':
    default:
      return ShieldCheck;
  }
}

export function AnalysisScanProgress({
  stages,
  elapsedMs,
  engineMode,
}: AnalysisScanProgressProps) {
  const activeIdx = getActiveScanStageIndex(elapsedMs, stages);
  const activeStage = stages[activeIdx] || stages[0];
  const progressPct = computeScanProgressPercent(
    elapsedMs,
    MINIMUM_SCAN_DURATION_MS
  );
  const elapsedSeconds = Math.min(15, Math.floor(elapsedMs / 1000));
  const ActiveIcon = activeStage ? getStageIcon(activeStage.id) : Radar;

  return (
    <section
      role="status"
      aria-live="polite"
      aria-label="Threat investigation in progress"
      data-testid="analysis-scan-progress"
      className="relative overflow-hidden rounded-[2px] border border-[#00F0C8]/35 bg-[#060E0E] p-6 sm:p-7"
    >
      {/* Subtle sweeping scan line across card */}
      <div
        aria-hidden="true"
        className="ss-animate-scan pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-transparent via-[#00F0C8]/10 to-transparent"
      />

      {/* Top status bar */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="ss-animate-pulse-cell absolute inline-flex h-full w-full rounded-full bg-[#00F0C8]" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#00F0C8]" />
          </span>
          <span className="font-mono text-xs font-semibold tracking-wider text-[#00F0C8] uppercase">
            {engineMode === 'live'
              ? 'Live AI · Deep Web Inspection'
              : 'SignalSure · Deep Scan Pipeline'}
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs text-[#8FA8A4] tabular-nums">
          <span>
            {String(elapsedSeconds).padStart(2, '0')}s / 15s
          </span>
          <span className="rounded-[2px] border border-[#00F0C8]/35 bg-[#030808] px-2 py-0.5 font-semibold text-[#00F0C8]">
            {progressPct}%
          </span>
        </div>
      </div>

      {/* Active visual probe readout */}
      {activeStage && (
        <div className="relative mt-5 rounded-[2px] border border-[#00F0C8]/30 bg-[#030909] p-4 sm:p-5">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[2px] border border-[#00F0C8]/40 bg-[#071A18] text-[#00F0C8]">
              <ActiveIcon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Loader2
                  className="h-3.5 w-3.5 shrink-0 animate-spin text-[#00F0C8]"
                  aria-hidden="true"
                />
                <p className="font-display text-sm font-semibold text-white sm:text-base">
                  {activeStage.title}
                </p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[#B6CCC8] sm:text-sm">
                {activeStage.detail}
              </p>
              <p className="mt-2 truncate font-mono text-[11px] text-[#7FE8D6]">
                &rsaquo; {activeStage.targetHint}
              </p>
            </div>
          </div>

          {/* Smooth progress bar */}
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-[2px] bg-[#0B1B19]">
            <div
              className="h-full bg-gradient-to-r from-[#00A88E] via-[#00F0C8] to-[#7CFFF0] transition-all duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Clean sequential 6-stage checklist */}
      <ol className="relative mt-5 space-y-2">
        {stages.map((stage, index) => {
          const isComplete = index < activeIdx;
          const isCurrent = index === activeIdx;
          return (
            <li
              key={stage.id}
              className={`flex items-center justify-between gap-3 rounded-[2px] border px-3.5 py-2.5 text-xs transition-colors duration-200 ${
                isCurrent
                  ? 'border-[#00F0C8]/45 bg-[#061816] text-white'
                  : isComplete
                  ? 'border-white/10 bg-[#040B0B] text-[#A3B8B5]'
                  : 'border-white/5 bg-[#030707] text-[#5C736F]'
              }`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                {isComplete ? (
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-[#00F0C8]"
                    aria-hidden="true"
                  />
                ) : isCurrent ? (
                  <Loader2
                    className="h-4 w-4 shrink-0 animate-spin text-[#00F0C8]"
                    aria-hidden="true"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="inline-block h-2 w-2 shrink-0 rounded-full border border-[#5C736F] mx-1"
                  />
                )}
                <span className="truncate font-medium">{stage.title}</span>
              </div>

              <span className="shrink-0 font-mono text-[11px]">
                {isComplete ? 'Done' : isCurrent ? 'Scanning' : 'Queued'}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
