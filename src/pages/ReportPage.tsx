import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
  PhoneCall,
} from 'lucide-react';
import type {
  IncidentReportInput,
  IncidentReportReceipt,
  ServerCapabilities,
} from '../lib/types';
import { validateIncidentInput } from '../lib/validation';

interface ReportPageProps {
  capabilities: ServerCapabilities | null;
}

const SCAM_TYPES = [
  'UPI & Payment Collect Fraud',
  'Bank / KYC Impersonation',
  'Fake Job / Telegram Task Offer',
  'Phishing / Lookalike Link',
  'Courier / Customs / Digital Arrest Call',
  'Investment / Trading Group Scam',
  'Other Suspicious Outreach',
];

const CHANNELS = [
  'SMS',
  'WhatsApp',
  'Telegram',
  'Phone / Video Call',
  'Email',
  'Website / Social Ad',
];

const INITIAL_FORM: IncidentReportInput = {
  scamType: '',
  channel: '',
  approximateDate: '',
  description: '',
  contactEmail: '',
};

export function ReportPage({ capabilities }: ReportPageProps) {
  const [form, setForm] = useState<IncidentReportInput>(INITIAL_FORM);
  const [errors, setErrors] = useState<
    Partial<Record<keyof IncidentReportInput, string>>
  >({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<IncidentReportReceipt | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const check = validateIncidentInput(form);
    if (!check.valid) {
      setErrors(check.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.errors && typeof data.errors === 'object') {
          setErrors(data.errors);
        }
        setServerError(
          typeof data?.message === 'string'
            ? data.message
            : 'Unable to submit incident report.'
        );
        setSubmitting(false);
        return;
      }

      setReceipt(data as IncidentReportReceipt);
    } catch {
      setServerError(
        'Network error submitting the report. If this involves financial loss, contact 1930 or cybercrime.gov.in directly.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setErrors({});
    setServerError(null);
    setReceipt(null);
  };

  const hasLiveWebhooks = Boolean(
    capabilities?.sheetsWebhookConfigured ||
      capabilities?.zapierWebhookConfigured ||
      capabilities?.gmailAlertConfigured
  );

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="border-b border-white/10 pb-8">
        <h1 className="font-cyber text-2xl font-normal tracking-wide text-white uppercase sm:text-4xl">
          Report an Incident
        </h1>
        <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-[#A3B8B5] sm:text-base">
          Share anonymized scam patterns to help document emerging tactics in
          India. Never include passwords, OTPs, PINs, CVVs, or identity documents.
        </p>
      </div>

      {/* Explicit Official Police / Portal Disclaimer */}
      <div className="mt-6 rounded-[2px] border border-amber-500/35 bg-amber-950/15 p-5">
        <div className="flex items-start gap-3">
          <PhoneCall
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-300"
            aria-hidden="true"
          />
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-amber-200">
              This is a SignalSure project intake form — not an official police complaint
            </p>
            <p className="text-xs leading-relaxed text-[#D7E8E5] sm:text-sm">
              If you have lost money, authorized a transfer, or experienced
              extortion, report immediately to India’s official cybercrime
              authorities:
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1 text-xs sm:text-sm">
              <span className="font-medium text-white">
                Helpline:{' '}
                <span className="font-mono text-amber-300">1930</span>
              </span>
              <a
                href="https://cybercrime.gov.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-[#00F0C8] hover:text-[#66F9E0]"
              >
                National Cyber Crime Reporting Portal
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
              <a
                href="https://sancharsaathi.gov.in/sfc/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-[#00F0C8] hover:text-[#66F9E0]"
              >
                Sanchar Saathi Chakshu
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-7">
          {receipt ? (
            <section
              aria-live="polite"
              data-testid="incident-receipt"
              className="rounded-[2px] border border-[#00F0C8]/40 bg-[#070E0E] p-6"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2
                  className="mt-0.5 h-6 w-6 shrink-0 text-[#00F0C8]"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs font-medium text-amber-300">
                    {receipt.mode === 'demo'
                      ? 'Demo Submission Recorded'
                      : 'Live Integration Submission'}
                  </p>
                  <h2 className="mt-1 font-display text-xl font-semibold text-white">
                    Thank you — reference {receipt.referenceId}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#B6CCC8]">
                    {receipt.message}
                  </p>
                  <p className="mt-3 font-mono text-xs text-[#7E9692]">
                    Recorded at {new Date(receipt.submittedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-6 border-t border-white/10 pt-5">
                <button
                  type="button"
                  onClick={handleReset}
                  className="min-h-10 rounded-[2px] border border-white/15 bg-[#030808] px-4 py-2 text-xs font-medium text-white hover:border-[#00F0C8]/50"
                >
                  Submit another report
                </button>
              </div>
            </section>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="space-y-5 rounded-[2px] border border-white/10 bg-[#070E0E] p-6"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="incident-scam-type"
                    className="block text-sm font-medium text-[#E2EFEA]"
                  >
                    Scam or threat type
                  </label>
                  <select
                    id="incident-scam-type"
                    value={form.scamType}
                    onChange={(e) => {
                      setForm({ ...form, scamType: e.target.value });
                      if (errors.scamType)
                        setErrors({ ...errors, scamType: undefined });
                    }}
                    className="mt-2 min-h-11 w-full rounded-[2px] border border-white/15 bg-[#030808] px-3 py-2.5 text-sm text-white focus:border-[#00F0C8] focus:outline-none"
                  >
                    <option value="">Select category...</option>
                    {SCAM_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  {errors.scamType && (
                    <p className="mt-1.5 text-xs text-rose-300">
                      {errors.scamType}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="incident-channel"
                    className="block text-sm font-medium text-[#E2EFEA]"
                  >
                    Communication channel
                  </label>
                  <select
                    id="incident-channel"
                    value={form.channel}
                    onChange={(e) => {
                      setForm({ ...form, channel: e.target.value });
                      if (errors.channel)
                        setErrors({ ...errors, channel: undefined });
                    }}
                    className="mt-2 min-h-11 w-full rounded-[2px] border border-white/15 bg-[#030808] px-3 py-2.5 text-sm text-white focus:border-[#00F0C8] focus:outline-none"
                  >
                    <option value="">Select channel...</option>
                    {CHANNELS.map((ch) => (
                      <option key={ch} value={ch}>
                        {ch}
                      </option>
                    ))}
                  </select>
                  {errors.channel && (
                    <p className="mt-1.5 text-xs text-rose-300">
                      {errors.channel}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="incident-date"
                    className="block text-sm font-medium text-[#E2EFEA]"
                  >
                    Approximate date
                  </label>
                  <input
                    id="incident-date"
                    type="date"
                    value={form.approximateDate}
                    onChange={(e) => {
                      setForm({ ...form, approximateDate: e.target.value });
                      if (errors.approximateDate)
                        setErrors({ ...errors, approximateDate: undefined });
                    }}
                    className="mt-2 min-h-11 w-full rounded-[2px] border border-white/15 bg-[#030808] px-3 py-2.5 text-sm text-white focus:border-[#00F0C8] focus:outline-none"
                  />
                  {errors.approximateDate && (
                    <p className="mt-1.5 text-xs text-rose-300">
                      {errors.approximateDate}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="incident-email"
                    className="block text-sm font-medium text-[#E2EFEA]"
                  >
                    Contact email (optional)
                  </label>
                  <input
                    id="incident-email"
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => {
                      setForm({ ...form, contactEmail: e.target.value });
                      if (errors.contactEmail)
                        setErrors({ ...errors, contactEmail: undefined });
                    }}
                    placeholder="Optional follow-up email"
                    className="mt-2 min-h-11 w-full rounded-[2px] border border-white/15 bg-[#030808] px-3.5 py-2.5 text-sm text-white placeholder:text-[#5C736F] focus:border-[#00F0C8] focus:outline-none"
                  />
                  {errors.contactEmail && (
                    <p className="mt-1.5 text-xs text-rose-300">
                      {errors.contactEmail}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="incident-description"
                    className="block text-sm font-medium text-[#E2EFEA]"
                  >
                    What happened (do not include passwords, OTPs, PINs, or card numbers)
                  </label>
                  <span className="font-mono text-xs text-[#7E9692] tabular-nums">
                    {form.description.length} / 2,500
                  </span>
                </div>
                <textarea
                  id="incident-description"
                  rows={5}
                  maxLength={2500}
                  value={form.description}
                  onChange={(e) => {
                    setForm({ ...form, description: e.target.value });
                    if (errors.description)
                      setErrors({ ...errors, description: undefined });
                  }}
                  placeholder="Describe the scam tactic, suspicious domain, or message pattern without personal secrets..."
                  className="mt-2 w-full rounded-[2px] border border-white/15 bg-[#030808] px-3.5 py-3 text-sm leading-relaxed text-white placeholder:text-[#5C736F] focus:border-[#00F0C8] focus:outline-none"
                />
                {errors.description && (
                  <p className="mt-1.5 text-xs text-rose-300">
                    {errors.description}
                  </p>
                )}
              </div>

              {serverError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-[2px] border border-rose-500/40 bg-rose-950/25 p-3 text-xs text-rose-200"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{serverError}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="text-xs text-[#7E9692]">
                  {hasLiveWebhooks
                    ? 'Connected to configured server webhook(s).'
                    : 'Demo mode: no external spreadsheet or Zapier webhook connected yet.'}
                </p>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-[2px] bg-[#00F0C8] px-5 py-2.5 text-xs font-semibold tracking-wider text-[#031411] uppercase transition-colors hover:bg-[#3BF7D8] disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Submitting...
                    </>
                  ) : hasLiveWebhooks ? (
                    'Submit incident report'
                  ) : (
                    'Submit report (Demo)'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Integration Readiness Sidebar */}
        <aside className="space-y-4 lg:col-span-5">
          <div className="rounded-[2px] border border-white/10 bg-[#070E0E] p-5">
            <h2 className="font-display text-base font-semibold text-white">
              Workflow & Reporting Integrations
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-[#8FA8A4]">
              This form forwards sanitized, non-sensitive reports to external
              connectors only when their HTTPS webhooks are configured on the server.
            </p>

            <ul className="mt-4 divide-y divide-white/10 text-xs">
              <li className="flex items-center justify-between py-2.5">
                <span className="text-[#E2EFEA]">Google Forms / Sheets</span>
                <span
                  className={
                    capabilities?.sheetsWebhookConfigured
                      ? 'font-medium text-[#00F0C8]'
                      : 'text-amber-300'
                  }
                >
                  {capabilities?.sheetsWebhookConfigured
                    ? 'Configured'
                    : 'Needs GOOGLE_SHEETS_WEBHOOK_URL'}
                </span>
              </li>
              <li className="flex items-center justify-between py-2.5">
                <span className="text-[#E2EFEA]">Zapier Automation</span>
                <span
                  className={
                    capabilities?.zapierWebhookConfigured
                      ? 'font-medium text-[#00F0C8]'
                      : 'text-amber-300'
                  }
                >
                  {capabilities?.zapierWebhookConfigured
                    ? 'Configured'
                    : 'Needs ZAPIER_INCIDENT_WEBHOOK_URL'}
                </span>
              </li>
              <li className="flex items-center justify-between py-2.5">
                <span className="text-[#E2EFEA]">Gmail Alert Relay</span>
                <span
                  className={
                    capabilities?.gmailAlertConfigured
                      ? 'font-medium text-[#00F0C8]'
                      : 'text-amber-300'
                  }
                >
                  {capabilities?.gmailAlertConfigured
                    ? 'Configured'
                    : 'Needs GMAIL_ALERT_WEBHOOK_URL'}
                </span>
              </li>
              <li className="flex items-center justify-between py-2.5">
                <span className="text-[#E2EFEA]">Looker Studio Trends</span>
                <span
                  className={
                    capabilities?.lookerStudioConfigured
                      ? 'font-medium text-[#00F0C8]'
                      : 'text-amber-300'
                  }
                >
                  {capabilities?.lookerStudioConfigured
                    ? 'Linked'
                    : 'Needs LOOKER_STUDIO_REPORT_URL'}
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-[2px] border border-white/10 bg-[#070E0E] p-5">
            <div className="flex items-start gap-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#00F0C8]" aria-hidden="true" />
              <div className="text-xs leading-relaxed text-[#C5DAD6]">
                <p className="font-semibold text-white">Data minimization rule</p>
                <p className="mt-1 text-[#8FA8A4]">
                  We intentionally omit fields for Aadhaar, PAN, full bank
                  account numbers, card digits, or OTPs. Keep descriptions
                  focused on the scammer’s tactic, domain, or handle.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
