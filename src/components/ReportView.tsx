import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Globe,
  Info,
  PhoneCall,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import type { AnalysisReport, RiskLevel } from '../lib/types';
import { sanitizeExternalUrl } from '../lib/validation';

interface ReportViewProps {
  report: AnalysisReport;
  compact?: boolean;
}

function getRiskVisuals(level: RiskLevel) {
  switch (level) {
    case 'Critical':
      return {
        label: 'Critical Risk',
        borderClass: 'border-rose-500/40 bg-rose-950/25 text-rose-200',
        badgeText: 'text-rose-300',
        Icon: ShieldAlert,
      };
    case 'High':
      return {
        label: 'High Risk',
        borderClass: 'border-amber-500/40 bg-amber-950/25 text-amber-200',
        badgeText: 'text-amber-300',
        Icon: AlertTriangle,
      };
    case 'Medium':
      return {
        label: 'Medium Caution',
        borderClass: 'border-amber-400/30 bg-amber-950/15 text-amber-100',
        badgeText: 'text-amber-200',
        Icon: Info,
      };
    case 'Low':
    default:
      return {
        label: 'Low Observed Signals',
        borderClass: 'border-[#00F0C8]/35 bg-[#051F1B] text-[#D7FBF3]',
        badgeText: 'text-[#00F0C8]',
        Icon: ShieldCheck,
      };
  }
}

export function ReportView({ report, compact = false }: ReportViewProps) {
  const risk = getRiskVisuals(report.riskLevel);
  const RiskIcon = risk.Icon;

  return (
    <article
      aria-label="Analysis report"
      className="rounded-[2px] border border-white/10 bg-[#070E0E] p-5 sm:p-6"
    >
      {/* Top report header: honest mode + risk + category */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#8FA8A4]">
            <span className="font-medium text-[#E2EFEA]">
              {report.mode === 'demo'
                ? 'Demo Mode · Sample Rule Engine'
                : 'Live AI · Google Search Research'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{report.category}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-[#7C9390]">
              {report.inputKind === 'url' ? 'URL check' : 'Message check'}
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-2.5">
            <RiskIcon className={`h-5 w-5 shrink-0 ${risk.badgeText}`} aria-hidden="true" />
            <h3 className="font-cyber text-lg font-normal tracking-wide text-white uppercase sm:text-xl">
              {risk.label}
            </h3>
          </div>
        </div>

        <div
          className={`rounded-[2px] border px-3 py-1.5 text-xs font-medium ${risk.borderClass}`}
        >
          {report.mode === 'demo'
            ? 'Example / Demo Assessment'
            : 'AI-Assisted Assessment'}
        </div>
      </div>

      {/* Plain-language summary */}
      <p className="mt-5 text-sm leading-relaxed text-[#D8EAE6] sm:text-base">
        {report.summary}
      </p>

      {/* Observed Evidence */}
      <section className="mt-6">
        <h4 className="font-display text-sm font-semibold text-white">
          Observed evidence in submission
        </h4>
        {report.observedEvidence.length > 0 ? (
          <ul className="mt-3 divide-y divide-white/10 border-y border-white/10">
            {report.observedEvidence.map((item, idx) => (
              <li
                key={`${item.indicatorType}-${idx}`}
                className="py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-[#F1F7F6]">
                    {item.indicatorType}
                  </span>
                  <span
                    className={`font-medium ${
                      item.severity === 'critical'
                        ? 'text-rose-300'
                        : item.severity === 'high'
                        ? 'text-amber-300'
                        : 'text-[#00F0C8]'
                    }`}
                  >
                    {item.severity === 'critical'
                      ? 'Critical cue'
                      : item.severity === 'high'
                      ? 'High-risk cue'
                      : 'Caution cue'}
                  </span>
                </div>
                <blockquote className="mt-2 rounded-[2px] border border-white/10 bg-[#030808] px-3 py-2 font-mono text-xs leading-relaxed text-[#8CEEE0] [overflow-wrap:anywhere]">
                  “{item.quotedPhrase}”
                </blockquote>
                <p className="mt-2.5 text-sm leading-relaxed text-[#B6CCC8]">
                  {item.whyItMatters}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 rounded-[2px] border border-white/10 bg-[#040B0B] p-4 text-sm text-[#B6CCC8]">
            No common scam phrases were matched in the submitted text. Remember:
            the absence of obvious warning keywords never proves a message or
            link is genuine.
          </p>
        )}
      </section>

      {/* Web Research & Official Verification Sources (Live Gemini + Google Search) */}
      {!compact &&
        (report.researchSummary ||
          (report.researchQueries && report.researchQueries.length > 0) ||
          (report.researchSources && report.researchSources.length > 0)) && (
          <section
            aria-label="Web research and sources"
            className="mt-6 rounded-[2px] border border-[#00F0C8]/25 bg-[#041110] p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-[#00F0C8]" aria-hidden="true" />
                <h4 className="font-display text-sm font-semibold text-white">
                  Gemini web research & verification
                </h4>
              </div>
              {report.modelLabel && (
                <span className="font-mono text-[11px] text-[#7E9692]">
                  {report.modelLabel}
                </span>
              )}
            </div>

            {report.researchSummary && (
              <p className="mt-2.5 text-sm leading-relaxed text-[#CDE2DE]">
                {report.researchSummary}
              </p>
            )}

            {report.researchQueries && report.researchQueries.length > 0 && (
              <div className="mt-3.5">
                <p className="text-[11px] font-medium tracking-wider text-[#7E9692] uppercase">
                  Search checks run
                </p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {report.researchQueries.map((query, idx) => (
                    <span
                      key={`${query}-${idx}`}
                      className="inline-flex items-center gap-1.5 rounded-[2px] border border-white/10 bg-[#030808] px-2.5 py-1 font-mono text-[11px] text-[#9CC5BF]"
                    >
                      <Search className="h-3 w-3 text-[#00F0C8]" aria-hidden="true" />
                      {query}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {report.researchSources && report.researchSources.length > 0 && (
              <div className="mt-4 border-t border-white/10 pt-3.5">
                <p className="text-[11px] font-medium tracking-wider text-[#7E9692] uppercase">
                  Sources consulted
                </p>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {report.researchSources.map((src) => {
                    const safeHref = sanitizeExternalUrl(src.url);
                    if (!safeHref) return null;
                    return (
                      <li key={safeHref}>
                        <a
                          href={safeHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-2 rounded-[2px] border border-white/10 bg-[#030808] px-3 py-2 text-xs text-[#C5DAD6] transition-colors hover:border-[#00F0C8]/50 hover:text-white"
                        >
                          <span className="truncate font-medium">{src.title}</span>
                          <ExternalLink
                            className="h-3.5 w-3.5 shrink-0 text-[#00F0C8]"
                            aria-hidden="true"
                          />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>
        )}

      {/* Information Gaps: separating evidence from what cannot be verified */}
      <section className="mt-6">
        <h4 className="font-display text-sm font-semibold text-white">
          What cannot be verified from this input alone
        </h4>
        <ul className="mt-2.5 space-y-2 text-sm text-[#B6CCC8]">
          {report.informationGaps.map((gap, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <Info
                className="mt-0.5 h-4 w-4 shrink-0 text-[#7C9390]"
                aria-hidden="true"
              />
              <span>{gap}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Recommended Next Steps & Independent Verification */}
      {!compact && (
        <div className="mt-6 grid gap-5 border-t border-white/10 pt-6 sm:grid-cols-2">
          <div>
            <h4 className="font-display text-sm font-semibold text-white">
              Recommended next steps
            </h4>
            <ul className="mt-2.5 space-y-2 text-sm text-[#B6CCC8]">
              {report.recommendedNextSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#00F0C8]"
                    aria-hidden="true"
                  />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-white">
              Independent verification
            </h4>
            <p className="mt-2.5 text-sm leading-relaxed text-[#B6CCC8]">
              {report.verificationGuidance}
            </p>
          </div>
        </div>
      )}

      {/* India Emergency Guidance */}
      <div className="mt-6 rounded-[2px] border border-amber-500/25 bg-amber-950/15 p-4">
        <div className="flex items-start gap-3">
          <PhoneCall
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-300"
            aria-hidden="true"
          />
          <div className="text-xs leading-relaxed text-[#E2EFEA] sm:text-sm">
            <p className="font-semibold text-amber-200">
              If money was lost or credentials were shared in India
            </p>
            <p className="mt-1 text-[#C5DAD6]">{report.indiaEmergencyGuidance}</p>
            <div className="mt-2.5 flex flex-wrap gap-4 text-xs">
              <a
                href="https://cybercrime.gov.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-[#00F0C8] hover:text-[#66F9E0]"
              >
                cybercrime.gov.in
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
              <a
                href="https://sancharsaathi.gov.in/sfc/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-[#00F0C8] hover:text-[#66F9E0]"
              >
                Sanchar Saathi Chakshu
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Mandatory AI-assisted assessment disclaimer */}
      <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-relaxed text-[#7E9692]">
        {report.disclaimer}
      </p>
    </article>
  );
}
