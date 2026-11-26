import { ArrowRight } from 'lucide-react';
import type { AppRoute } from '../components/Navbar';
import type { ServerCapabilities } from '../lib/types';

interface AboutPageProps {
  capabilities: ServerCapabilities | null;
  onNavigate: (route: AppRoute) => void;
}

export function AboutPage({ capabilities, onNavigate }: AboutPageProps) {
  const integrations = [
    {
      name: 'Server-side Gemini AI Analyzer & Assistant',
      envVar: 'GEMINI_API_KEY',
      configured: Boolean(capabilities?.aiAnalyzerConfigured),
      purpose:
        'Runs structured scam indicator extraction and safety Q&A exclusively on the server.',
    },
    {
      name: 'Firebase Firestore & Google Sign-In',
      envVar: 'firebase-applet-config.json',
      configured: true,
      purpose:
        'Persists private scan history summaries and incident logs scoped per verified Google account.',
    },
    {
      name: 'Botpress Webchat Widget',
      envVar: 'Webchat v5.0 Script (Embedded)',
      configured: true,
      purpose:
        'Embedded Botpress Webchat v5.0 bot active sitewide alongside SignalSure’s built-in safety assistant.',
    },
    {
      name: 'Google Sheets (1P Sync + Central Relay)',
      envVar: 'Google Sign-In / GOOGLE_SHEETS_WEBHOOK_URL',
      configured: true,
      purpose:
        'Signed-in users can create or append organized analysis logs directly to Google Sheets; GOOGLE_SHEETS_WEBHOOK_URL additionally collects all visitors into one central sheet.',
    },
    {
      name: 'Zapier Workflow Automation',
      envVar: 'ZAPIER_INCIDENT_WEBHOOK_URL',
      configured: Boolean(capabilities?.zapierWebhookConfigured),
      purpose:
        'Triggers downstream triage workflows from submitted incident reports.',
    },
    {
      name: 'Gmail Notification Relay',
      envVar: 'GMAIL_ALERT_WEBHOOK_URL',
      configured: Boolean(capabilities?.gmailAlertConfigured),
      purpose:
        'Sends optional triage email alerts when a new incident report arrives.',
    },
    {
      name: 'Looker Studio Analytics',
      envVar: 'LOOKER_STUDIO_REPORT_URL',
      configured: Boolean(capabilities?.lookerStudioConfigured),
      purpose:
        'Links to aggregated, non-PII regional scam category dashboards when connected.',
    },
  ];

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="border-b border-white/10 pb-8">
        <h1 className="font-cyber text-2xl font-normal tracking-wide text-white uppercase sm:text-4xl">
          About SignalSure
        </h1>
        <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-[#A3B8B5] sm:text-base">
          Built to help everyday internet users in India pause, inspect hidden
          manipulation cues, and verify independently before tapping links or
          approving payments.
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <section className="rounded-[2px] border border-white/10 bg-[#070E0E] p-6">
          <h2 className="font-display text-lg font-semibold text-white">
            How AI-assisted analysis works
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#B6CCC8]">
            SignalSure inspects submitted messages and URLs for documented
            social-engineering patterns—such as artificial urgency, bank or KYC
            impersonation, UPI PIN deception, prepaid task lures, and lookalike
            domains. Submissions are enclosed as untrusted data so text inside a
            message can never override analysis rules.
          </p>
        </section>

        <section className="rounded-[2px] border border-white/10 bg-[#070E0E] p-6">
          <h2 className="font-display text-lg font-semibold text-white">
            Honest limitations
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#B6CCC8]">
            No automated analyzer can detect 100% of scams or prove that a
            message or link is safe. SignalSure does not query live telecom
            registries, bank records, or private WHOIS databases from text
            alone, and always states what remains unverified.
          </p>
        </section>

        <section className="rounded-[2px] border border-white/10 bg-[#070E0E] p-6">
          <h2 className="font-display text-lg font-semibold text-white">
            Privacy & data minimization
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#B6CCC8]">
            Analyzer submissions are processed ephemerally without storing
            user-submitted messages on disk. Client checks warn immediately if
            card numbers or secret-sharing phrases appear, and our incident form
            never requests OTPs, PINs, or identity documents.
          </p>
        </section>
      </div>

      {/* Integration Status Table */}
      <section className="mt-12 rounded-[2px] border border-white/10 bg-[#070E0E] p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-cyber text-lg font-normal tracking-wide text-white uppercase sm:text-xl">
              Platform Integrations & Configuration
            </h2>
            <p className="mt-1 text-sm text-[#8FA8A4]">
              Live connector status reported directly by the server without
              exposing secret values.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/analyze')}
            className="inline-flex min-h-10 items-center gap-2 self-start whitespace-nowrap rounded-[2px] bg-[#00F0C8] px-4 py-2 text-xs font-semibold tracking-wider text-[#031411] uppercase hover:bg-[#3BF7D8]"
          >
            Open Analyzer
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-[#7E9692]">
                <th className="py-3 pr-4 font-medium">Integration</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 pr-4 font-medium">Server Variable</th>
                <th className="py-3 font-medium">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-xs sm:text-sm">
              {integrations.map((item) => (
                <tr key={item.name}>
                  <td className="py-3.5 pr-4 font-medium text-white">
                    {item.name}
                  </td>
                  <td className="py-3.5 pr-4">
                    <span
                      className={
                        item.configured
                          ? 'font-medium text-[#00F0C8]'
                          : 'font-medium text-amber-300'
                      }
                    >
                      {item.configured ? 'Configured' : 'Needs configuration'}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4 font-mono text-xs text-[#B6CCC8]">
                    {item.envVar}
                  </td>
                  <td className="py-3.5 text-[#8FA8A4]">{item.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
