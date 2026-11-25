import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Loader2,
  RotateCcw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { ReportView } from '../components/ReportView';
import { analyzeWithDemoEngine, SAMPLE_CASES } from '../lib/demoAnalyzer';
import type {
  AnalysisReport,
  InputKind,
  ServerCapabilities,
} from '../lib/types';
import {
  detectSensitiveDataWarning,
  MAX_ANALYSIS_LENGTH,
  validateAnalysisInput,
  validateAnalysisReport,
} from '../lib/validation';

interface AnalyzePageProps {
  capabilities: ServerCapabilities | null;
  initialSampleId?: string | null;
  onConsumeInitialSample: () => void;
}

export function AnalyzePage({
  capabilities,
  initialSampleId,
  onConsumeInitialSample,
}: AnalyzePageProps) {
  const [inputKind, setInputKind] = useState<InputKind>('message');
  const [content, setContent] = useState('');
  const [engineMode, setEngineMode] = useState<'demo' | 'live'>('demo');
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (capabilities?.aiAnalyzerConfigured) {
      setEngineMode('live');
    }
  }, [capabilities?.aiAnalyzerConfigured]);

  useEffect(() => {
    if (!initialSampleId) return;
    const found = SAMPLE_CASES.find((c) => c.id === initialSampleId);
    if (found) {
      setInputKind(found.inputKind);
      setContent(found.content);
      setValidationError(null);
      setApiError(null);
      setReport(null);
    }
    onConsumeInitialSample();
  }, [initialSampleId, onConsumeInitialSample]);

  const sensitiveWarning = content.trim()
    ? detectSensitiveDataWarning(content)
    : undefined;

  const runAnalysis = async (requestedMode: 'demo' | 'live') => {
    setValidationError(null);
    setApiError(null);

    const check = validateAnalysisInput(content, inputKind);
    if (!check.valid) {
      setValidationError(check.error || 'Please check your input.');
      return;
    }

    if (requestedMode === 'demo') {
      setLoading(true);
      // Brief intentional tick so state transition is clear and predictable
      await new Promise((r) => setTimeout(r, 120));
      const demoResult = analyzeWithDemoEngine(check.normalizedContent, inputKind);
      setReport(demoResult);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: check.normalizedContent,
          inputKind,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setApiError(
          typeof data?.message === 'string'
            ? data.message
            : 'Unable to complete live analysis.'
        );
        setLoading(false);
        return;
      }

      const validated = validateAnalysisReport(data, 'live', inputKind);
      setReport(validated);
    } catch {
      setApiError(
        'Network error reaching the SignalSure server. You can retry or switch to Demo Mode.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runAnalysis(engineMode);
  };

  const handleClear = () => {
    setContent('');
    setReport(null);
    setValidationError(null);
    setApiError(null);
  };

  const handleSelectSample = (sampleId: string) => {
    const sample = SAMPLE_CASES.find((c) => c.id === sampleId);
    if (!sample) return;
    setInputKind(sample.inputKind);
    setContent(sample.content);
    setValidationError(null);
    setApiError(null);
    setReport(null);
  };

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      {/* Page heading & mode disclosure */}
      <div className="flex flex-col gap-4 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="font-cyber text-2xl font-normal tracking-wide text-white uppercase sm:text-4xl">
            Message & Link Analyzer
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-[#A3B8B5] sm:text-base">
            Paste a suspicious SMS, WhatsApp forward, email, job offer, or web
            link to review potential social-engineering indicators before acting.
          </p>
        </div>

        {/* Engine mode switch (honest Demo vs Live AI status) */}
        <div className="flex flex-col items-start gap-1.5 lg:items-end">
          <div
            role="group"
            aria-label="Analysis engine mode"
            className="inline-flex rounded-[2px] border border-white/10 bg-[#070E0E] p-1"
          >
            <button
              type="button"
              onClick={() => {
                setEngineMode('demo');
                setApiError(null);
              }}
              className={`min-h-9 whitespace-nowrap rounded-[2px] px-3 py-1.5 text-xs font-medium transition-colors ${
                engineMode === 'demo'
                  ? 'bg-[#122623] text-white'
                  : 'text-[#8FA8A4] hover:text-white'
              }`}
            >
              Demo Mode
            </button>
            <button
              type="button"
              onClick={() => {
                setEngineMode('live');
                setApiError(null);
              }}
              className={`inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-[2px] px-3 py-1.5 text-xs font-medium transition-colors ${
                engineMode === 'live'
                  ? 'bg-[#00F0C8]/20 text-[#00F0C8]'
                  : 'text-[#8FA8A4] hover:text-white'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Live AI + Research
            </button>
          </div>
          <p className="text-xs text-[#7E9692]">
            {capabilities?.aiAnalyzerConfigured
              ? 'Gemini AI + Google Search grounding ready'
              : 'Demo Mode active · Live AI standby'}
          </p>
        </div>
      </div>

      {/* Mandatory privacy warning banner */}
      <div
        role="note"
        className="mt-6 flex items-start gap-3 rounded-[2px] border border-amber-500/30 bg-amber-950/15 p-4 text-sm text-amber-100"
      >
        <ShieldAlert
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-300"
          aria-hidden="true"
        />
        <div>
          <p className="font-medium text-amber-200">
            Privacy guardrail: never paste personal credentials
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#C5DAD6] sm:text-sm">
            Do not submit your passwords, OTPs, UPI PINs, ATM PINs, CVVs, Aadhaar
            numbers, or banking credentials. Redact personal details before
            analyzing. Results are an AI-assisted assessment, never proof that
            something is fraudulent or safe.
          </p>
        </div>
      </div>

      {/* Main 2-column workspace */}
      <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-start">
        {/* Left: Input Form + Sample Cases */}
        <div className="space-y-6 lg:col-span-5">
          <form
            onSubmit={handleSubmit}
            noValidate
            className="rounded-[2px] border border-white/10 bg-[#070E0E] p-5 sm:p-6"
          >
            {/* Input type tabs */}
            <div className="flex items-center justify-between gap-3">
              <div
                role="tablist"
                aria-label="Input type"
                className="inline-flex rounded-[2px] border border-white/10 bg-[#030808] p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={inputKind === 'message'}
                  onClick={() => {
                    setInputKind('message');
                    setValidationError(null);
                  }}
                  className={`min-h-9 whitespace-nowrap rounded-[2px] px-3 py-1.5 text-xs font-medium transition-colors ${
                    inputKind === 'message'
                      ? 'bg-[#122623] text-white'
                      : 'text-[#8FA8A4] hover:text-white'
                  }`}
                >
                  Message / Email
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={inputKind === 'url'}
                  onClick={() => {
                    setInputKind('url');
                    setValidationError(null);
                  }}
                  className={`min-h-9 whitespace-nowrap rounded-[2px] px-3 py-1.5 text-xs font-medium transition-colors ${
                    inputKind === 'url'
                      ? 'bg-[#122623] text-white'
                      : 'text-[#8FA8A4] hover:text-white'
                  }`}
                >
                  Suspicious URL
                </button>
              </div>

              <span className="font-mono text-xs text-[#7E9692] tabular-nums">
                {content.length} / {MAX_ANALYSIS_LENGTH.toLocaleString()}
              </span>
            </div>

            <div className="mt-4">
              <label
                htmlFor="analyzer-input"
                className="block text-sm font-medium text-[#E2EFEA]"
              >
                {inputKind === 'url'
                  ? 'Web link or domain to inspect'
                  : 'Suspicious SMS, WhatsApp message, email, or job offer'}
              </label>
              {inputKind === 'url' ? (
                <input
                  id="analyzer-input"
                  type="text"
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  maxLength={MAX_ANALYSIS_LENGTH}
                  placeholder="https://example-verify-kyc.xyz/login"
                  className="mt-2 w-full rounded-[2px] border border-white/15 bg-[#030808] px-3.5 py-3 font-mono text-sm text-white placeholder:text-[#5C736F] focus:border-[#00F0C8] focus:outline-none"
                />
              ) : (
                <textarea
                  id="analyzer-input"
                  rows={7}
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  maxLength={MAX_ANALYSIS_LENGTH}
                  placeholder="Paste the exact text of the message, offer, or email here..."
                  className="mt-2 w-full resize-y rounded-[2px] border border-white/15 bg-[#030808] px-3.5 py-3 text-sm leading-relaxed text-white placeholder:text-[#5C736F] focus:border-[#00F0C8] focus:outline-none"
                />
              )}
            </div>

            {sensitiveWarning && (
              <div
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-[2px] border border-rose-500/40 bg-rose-950/25 p-3 text-xs text-rose-200"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" aria-hidden="true" />
                <span>{sensitiveWarning}</span>
              </div>
            )}

            {validationError && (
              <p
                role="alert"
                className="mt-3 flex items-start gap-2 text-xs font-medium text-rose-300"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{validationError}</span>
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-[2px] bg-[#00F0C8] px-5 py-2.5 text-xs font-semibold tracking-wider text-[#031411] uppercase transition-colors hover:bg-[#3BF7D8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    {engineMode === 'live' ? 'Researching & Analyzing...' : 'Analyzing...'}
                  </>
                ) : engineMode === 'demo' ? (
                  'Analyze (Demo Mode)'
                ) : (
                  'Research & Analyze with Gemini AI'
                )}
              </button>

              <button
                type="button"
                onClick={handleClear}
                disabled={loading && !content}
                className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-[2px] border border-white/15 bg-[#030808] px-4 py-2.5 text-xs font-medium text-[#B6CCC8] transition-colors hover:border-white/30 hover:text-white"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Clear
              </button>
            </div>
          </form>

          {/* Sample cases drawer */}
          <div className="rounded-[2px] border border-white/10 bg-[#070E0E] p-5">
            <h2 className="font-display text-sm font-semibold text-white">
              Example inputs for testing
            </h2>
            <p className="mt-1 text-xs text-[#8FA8A4]">
              Load a realistic Indian scam example or low-signal notice to inspect
              how SignalSure separates evidence from assumptions.
            </p>
            <div className="mt-3.5 space-y-2">
              {SAMPLE_CASES.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handleSelectSample(sample.id)}
                  className="flex w-full items-start justify-between gap-3 rounded-[2px] border border-white/10 bg-[#030808] px-3.5 py-2.5 text-left transition-colors hover:border-[#00F0C8]/45 hover:bg-[#0A1615]"
                >
                  <div>
                    <p className="text-xs font-semibold text-[#F1F7F6]">
                      {sample.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[#8FA8A4]">
                      {sample.shortDescription}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-[#00F0C8]">
                    {sample.channel}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Structured Report / Loading / Error / Empty State */}
        <div className="lg:col-span-7">
          {loading && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-[2px] border border-white/10 bg-[#070E0E] p-8"
            >
              <div className="flex items-center gap-3 text-[#00F0C8]">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                <p className="font-display text-base font-semibold text-white">
                  {engineMode === 'live'
                    ? 'Researching claims with Google Search & analyzing indicators...'
                    : 'Scanning submission for social-engineering indicators...'}
                </p>
              </div>
              <p className="mt-2 text-sm text-[#8FA8A4]">
                {engineMode === 'live'
                  ? 'Verifying claimed brands, official portals, and documented Indian scam advisories via Gemini AI.'
                  : 'Separating observed phrases from unverified claims.'}
              </p>
            </div>
          )}

          {!loading && apiError && (
            <div
              role="alert"
              className="rounded-[2px] border border-rose-500/40 bg-rose-950/20 p-6"
            >
              <h2 className="font-display text-lg font-semibold text-rose-200">
                Live AI analysis unavailable
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#E2EFEA]">
                {apiError}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void runAnalysis('live')}
                  className="min-h-10 rounded-[2px] border border-white/15 bg-[#070E0E] px-4 py-2 text-xs font-medium text-white hover:border-white/30"
                >
                  Retry Live AI
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEngineMode('demo');
                    void runAnalysis('demo');
                  }}
                  className="min-h-10 rounded-[2px] bg-[#00F0C8] px-4 py-2 text-xs font-semibold text-[#031411] hover:bg-[#3BF7D8]"
                >
                  Run in Demo Mode instead
                </button>
              </div>
            </div>
          )}

          {!loading && !apiError && report && <ReportView report={report} />}

          {!loading && !apiError && !report && (
            <div className="rounded-[2px] border border-dashed border-white/15 bg-[#060D0D] p-8 text-left">
              <h2 className="font-cyber text-base tracking-wide text-white uppercase">
                Structured report will appear here
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#8FA8A4]">
                Submit a message or URL on the left, or pick an example case to
                see how SignalSure breaks down:
              </p>
              <ul className="mt-4 space-y-2 text-sm text-[#C5DAD6]">
                <li>1. Risk tier (Low / Medium / High / Critical) and scam category</li>
                <li>2. Verbatim quoted evidence phrases and why each indicator matters</li>
                <li>3. Explicit information gaps that cannot be verified from text alone</li>
                <li>4. Independent verification steps and India 1930 emergency resources</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
