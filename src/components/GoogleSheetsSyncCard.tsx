import { useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  Plus,
  Table2,
  Unlink,
} from 'lucide-react';
import { useFirebaseAuth } from './FirebaseProvider';
import { GoogleSignInButton } from './GoogleSignInButton';
import {
  APPS_SCRIPT_CENTRAL_SHEET_SNIPPET,
  buildOrganizedSheetRow,
  extractSpreadsheetId,
  SHEET_HEADERS,
  type ConnectedSheetTarget,
} from '../lib/googleSheets';
import type { AnalysisReport, ServerCapabilities } from '../lib/types';

export type PendingSheetAction =
  | { type: 'create_and_send' }
  | { type: 'append_current'; target: ConnectedSheetTarget }
  | { type: 'enable_auto_sync'; target: ConnectedSheetTarget };

interface GoogleSheetsSyncCardProps {
  report: AnalysisReport | null;
  rawInput: string;
  capabilities: ServerCapabilities | null;
  connectedSheet: ConnectedSheetTarget | null;
  autoSyncEnabled: boolean;
  sheetBusy: boolean;
  sheetError: string | null;
  lastSyncedAt: string | null;
  centralLogStatus: 'idle' | 'sending' | 'sent' | 'skipped' | 'failed';
  centralLogOptIn: boolean;
  onChangeCentralLogOptIn: (next: boolean) => void;
  threatAlertStatus: 'idle' | 'sending' | 'sent' | 'skipped' | 'failed';
  threatAlertOptIn: boolean;
  onChangeThreatAlertOptIn: (next: boolean) => void;
  onConnectExistingSheetId: (spreadsheetId: string) => void;
  onDisconnectSheet: () => void;
  onDisableAutoSync: () => void;
  onConfirmAction: (action: PendingSheetAction) => Promise<void>;
}

export function GoogleSheetsSyncCard({
  report,
  rawInput,
  capabilities,
  connectedSheet,
  autoSyncEnabled,
  sheetBusy,
  sheetError,
  lastSyncedAt,
  centralLogStatus,
  centralLogOptIn,
  onChangeCentralLogOptIn,
  threatAlertStatus,
  threatAlertOptIn,
  onChangeThreatAlertOptIn,
  onConnectExistingSheetId,
  onDisconnectSheet,
  onDisableAutoSync,
  onConfirmAction,
}: GoogleSheetsSyncCardProps) {
  const {
    user,
    authLoading,
    hasSheetsAccess,
    requestSheetsAccess,
  } = useFirebaseAuth();

  const [sheetInput, setSheetInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] =
    useState<PendingSheetAction | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const previewRow =
    report && rawInput
      ? buildOrganizedSheetRow({
          rawInput,
          userEmail: user?.email,
          report,
        })
      : null;

  const handleConnectSheetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);
    const id = extractSpreadsheetId(sheetInput);
    if (!id) {
      setInputError(
        'Paste a valid Google Sheets link (https://docs.google.com/spreadsheets/d/...) or Spreadsheet ID.'
      );
      return;
    }
    onConnectExistingSheetId(id);
    setSheetInput('');
  };

  const handleCopySnippet = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_CENTRAL_SHEET_SNIPPET);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    } catch {
      setCopiedSnippet(false);
    }
  };

  const handleConfirmClick = async () => {
    if (!pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);
    await onConfirmAction(action);
  };

  return (
    <section
      aria-label="Google Sheets organized logging"
      className="min-w-0 rounded-[2px] border border-white/10 bg-[#070E0E] p-5 sm:p-6"
    >
      <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2.5">
          <FileSpreadsheet
            className="mt-0.5 h-5 w-5 shrink-0 text-[#00F0C8]"
            aria-hidden="true"
          />
          <div>
            <h2 className="font-cyber text-sm font-normal tracking-wide text-white uppercase sm:text-base">
              Google Sheets Organized Export
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#8FA8A4]">
              Save applied inputs (redacted), logged-in email, risk category,
              evidence signals, and response guidance into an organized Google
              Sheet with frozen headers.
            </p>
          </div>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-[2px] border px-2.5 py-1 text-[11px] font-medium ${
            user && hasSheetsAccess
              ? 'border-[#00F0C8]/40 bg-[#00F0C8]/10 text-[#00F0C8]'
              : 'border-white/15 bg-[#030808] text-[#A3B8B5]'
          }`}
        >
          <Table2 className="h-3.5 w-3.5" aria-hidden="true" />
          {user && hasSheetsAccess
            ? 'Sheets Permission Active'
            : user
            ? 'Reconnect for Sheets'
            : 'Sign-In Required'}
        </span>
      </div>

      {/* Authentication state */}
      {(!user || !hasSheetsAccess) && (
        <div className="mt-4 flex flex-col gap-3 rounded-[2px] border border-white/10 bg-[#030808] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs leading-relaxed text-[#B6CCC8]">
            {user ? (
              <p>
                Signed in as <span className="font-medium text-white">{user.email}</span>.
                Reconnect Google once in this session to grant Google Sheets write
                access in memory.
              </p>
            ) : (
              <p>
                Sign in with Google so SignalSure can tag each row with your
                email and write organized analysis logs to your Google Sheet.
              </p>
            )}
          </div>
          <GoogleSignInButton
            label={user ? 'Connect Google Sheets' : 'Sign in with Google'}
            loading={authLoading}
            onClick={() => void requestSheetsAccess()}
            className="shrink-0 self-start sm:self-center"
          />
        </div>
      )}

      {/* Connected Google Sheet or Creation Controls */}
      {user && hasSheetsAccess && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#A3B8B5]">
            <span>
              Logging email:{' '}
              <span className="font-mono text-[#E2EFEA]">
                {user.email || 'Signed-in Google account'}
              </span>
            </span>
            {lastSyncedAt && (
              <span className="inline-flex items-center gap-1 text-[#00F0C8]">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Last synced {new Date(lastSyncedAt).toLocaleTimeString()}
              </span>
            )}
          </div>

          {connectedSheet ? (
            <div className="rounded-[2px] border border-[#00F0C8]/25 bg-[#030808] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-white">
                    {connectedSheet.title}{' '}
                    <span className="font-mono font-normal text-[#8FA8A4]">
                      ({connectedSheet.tabTitle})
                    </span>
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-[#7E9692]">
                    ID: {connectedSheet.spreadsheetId}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={connectedSheet.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-8 items-center gap-1 rounded-[2px] border border-white/15 px-2.5 py-1 text-xs font-medium text-[#00F0C8] hover:border-[#00F0C8]/50"
                  >
                    Open Sheet
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                  <button
                    type="button"
                    onClick={onDisconnectSheet}
                    disabled={sheetBusy}
                    className="inline-flex min-h-8 items-center gap-1 rounded-[2px] border border-white/15 px-2.5 py-1 text-xs text-[#A3B8B5] hover:border-rose-400/50 hover:text-rose-300 disabled:opacity-50"
                  >
                    <Unlink className="h-3 w-3" aria-hidden="true" />
                    Change Sheet
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[#C5DAD6]">
                  <input
                    type="checkbox"
                    checked={autoSyncEnabled}
                    disabled={sheetBusy}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPendingAction({
                          type: 'enable_auto_sync',
                          target: connectedSheet,
                        });
                      } else {
                        onDisableAutoSync();
                      }
                    }}
                    className="h-4 w-4 accent-[#00F0C8]"
                  />
                  Auto-send every new analysis result to this sheet
                </label>

                {report && (
                  <button
                    type="button"
                    disabled={sheetBusy}
                    onClick={() =>
                      setPendingAction({
                        type: 'append_current',
                        target: connectedSheet,
                      })
                    }
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-[2px] bg-[#00F0C8] px-3.5 py-1.5 text-xs font-semibold tracking-wide text-[#031411] uppercase transition-colors hover:bg-[#3BF7D8] disabled:opacity-60"
                  >
                    {sheetBusy ? (
                      <>
                        <Loader2
                          className="h-3.5 w-3.5 animate-spin"
                          aria-hidden="true"
                        />
                        Sending...
                      </>
                    ) : (
                      'Send This Result to Sheet'
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-[2px] border border-white/10 bg-[#030808] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-[#C5DAD6]">
                  Create a formatted SignalSure Google Sheet or paste an existing
                  spreadsheet link below.
                </p>
                <button
                  type="button"
                  disabled={sheetBusy}
                  onClick={() => setPendingAction({ type: 'create_and_send' })}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-[2px] bg-[#00F0C8] px-3.5 py-1.5 text-xs font-semibold tracking-wide text-[#031411] uppercase transition-colors hover:bg-[#3BF7D8] disabled:opacity-60"
                >
                  {sheetBusy ? (
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {report
                    ? 'Create Organized Sheet & Send'
                    : 'Create Organized Sheet'}
                </button>
              </div>

              <form
                onSubmit={handleConnectSheetSubmit}
                className="flex flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row"
              >
                <label htmlFor="existing-sheet-url" className="sr-only">
                  Existing Google Sheet URL or ID
                </label>
                <input
                  id="existing-sheet-url"
                  type="text"
                  value={sheetInput}
                  onChange={(e) => {
                    setSheetInput(e.target.value);
                    if (inputError) setInputError(null);
                  }}
                  placeholder="Paste existing Google Sheet URL or Spreadsheet ID..."
                  className="min-h-9 flex-1 rounded-[2px] border border-white/15 bg-[#070E0E] px-3 py-1.5 font-mono text-xs text-white placeholder:text-[#5C736F] focus:border-[#00F0C8] focus:outline-none"
                />
                <button
                  type="submit"
                  className="min-h-9 shrink-0 rounded-[2px] border border-white/20 bg-[#070E0E] px-3.5 py-1.5 text-xs font-medium text-[#E2EFEA] hover:border-[#00F0C8]/60 hover:text-white"
                >
                  Connect Sheet
                </button>
              </form>
              {inputError && (
                <p role="alert" className="text-xs text-rose-300">
                  {inputError}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {sheetError && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-[2px] border border-rose-500/40 bg-rose-950/25 p-3 text-xs text-rose-200"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{sheetError}</span>
        </div>
      )}

      {/* Central All-Users Sheet Webhook Relay */}
      <div className="mt-4 border-t border-white/10 pt-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[#A3B8B5]">
            <span className="font-medium text-white">Central Master Sheet Relay: </span>
            {capabilities?.sheetsWebhookConfigured ? (
              <span className="text-[#00F0C8]">
                Active (forwards every user&apos;s organized scan row when enabled)
              </span>
            ) : (
              <span className="text-amber-300">
                Standby (needs server GOOGLE_SHEETS_WEBHOOK_URL for multi-user aggregation)
              </span>
            )}
          </div>

          {capabilities?.sheetsWebhookConfigured && (
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[#C5DAD6]">
              <input
                type="checkbox"
                checked={centralLogOptIn}
                onChange={(e) => onChangeCentralLogOptIn(e.target.checked)}
                className="h-4 w-4 accent-[#00F0C8]"
              />
              Send scans to central sheet
            </label>
          )}
        </div>

        {capabilities?.sheetsWebhookConfigured && centralLogStatus === 'sent' && (
          <p className="mt-1.5 text-[#00F0C8]">
            Central master sheet logged this analysis row with signed-in email and response summary.
          </p>
        )}
        {capabilities?.sheetsWebhookConfigured && centralLogStatus === 'failed' && (
          <p className="mt-1.5 text-amber-300">
            Central master sheet webhook did not acknowledge this entry; local view and personal Sheet sync remain unaffected.
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
          <div className="text-[#A3B8B5]">
            <span className="font-medium text-white">Developer Gmail Threat Alerts: </span>
            {capabilities?.gmailAlertConfigured ? (
              <span className="text-[#00F0C8]">
                Active (emails signed-in users on High/Critical threats)
              </span>
            ) : (
              <span className="text-amber-300">
                Standby (needs server GMAIL_ALERT_WEBHOOK_URL)
              </span>
            )}
          </div>

          {capabilities?.gmailAlertConfigured && user?.emailVerified && (
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[#C5DAD6]">
              <input
                type="checkbox"
                checked={threatAlertOptIn}
                onChange={(e) => onChangeThreatAlertOptIn(e.target.checked)}
                className="h-4 w-4 accent-[#00F0C8]"
              />
              Email me on High/Critical threats
            </label>
          )}
        </div>

        {capabilities?.gmailAlertConfigured && threatAlertStatus === 'sent' && user?.email && (
          <p className="mt-1.5 text-[#00F0C8]">
            Threat warning email sent to {user.email} from the SignalSure developer relay.
          </p>
        )}
        {capabilities?.gmailAlertConfigured && threatAlertStatus === 'failed' && (
          <p className="mt-1.5 text-amber-300">
            Threat alert email could not be delivered right now; review the safety steps above.
          </p>
        )}

        <details className="mt-2.5 text-[#8FA8A4]">
          <summary className="cursor-pointer font-medium text-[#B6CCC8] hover:text-white">
            Want one Google Sheet + automatic Gmail threat alerts from your developer email?
          </summary>
          <div className="mt-2 space-y-2 rounded-[2px] border border-white/10 bg-[#030808] p-3 text-[11px] leading-relaxed">
            <p>
              Individual Google Sign-in writes directly to each signed-in user&apos;s
              own Google Sheet. To automatically collect{' '}
              <strong className="text-white">every user&apos;s</strong> email,
              applied input, and response message into your single master sheet
              AND email High/Critical alerts from your developer Gmail, open{' '}
              <span className="font-mono text-[#E2EFEA]">
                Extensions &rarr; Apps Script
              </span>{' '}
              on your <span className="font-mono text-white">SignalSure</span> sheet,
              deploy this Web App (<em>Execute as: Me</em>, <em>Who has access: Anyone</em>),
              and set that HTTPS URL in{' '}
              <span className="font-mono text-[#00F0C8]">
                Settings &rarr; Secrets
              </span>{' '}
              for both{' '}
              <span className="font-mono text-[#00F0C8]">
                GOOGLE_SHEETS_WEBHOOK_URL
              </span>{' '}
              and{' '}
              <span className="font-mono text-[#00F0C8]">
                GMAIL_ALERT_WEBHOOK_URL
              </span>
              :
            </p>
            <div className="relative min-w-0 max-w-full">
              <pre className="max-w-full overflow-x-auto rounded-[2px] border border-white/10 bg-[#070E0E] p-2.5 font-mono text-[10px] text-[#C5DAD6] whitespace-pre-wrap [overflow-wrap:anywhere] sm:whitespace-pre">
                {APPS_SCRIPT_CENTRAL_SHEET_SNIPPET}
              </pre>
              <button
                type="button"
                onClick={() => void handleCopySnippet()}
                className="mt-2 inline-flex items-center gap-1 rounded-[2px] border border-white/15 bg-[#070E0E] px-2.5 py-1 text-[11px] text-[#E2EFEA] hover:border-[#00F0C8]/50"
              >
                {copiedSnippet ? (
                  <>
                    <Check className="h-3 w-3 text-[#00F0C8]" aria-hidden="true" />
                    Copied Apps Script
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" aria-hidden="true" />
                    Copy Apps Script
                  </>
                )}
              </button>
            </div>
          </div>
        </details>
      </div>

      {/* Explicit Confirmation Modal before creating/mutating Google Sheet data */}
      {pendingAction && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sheets-confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-[2px] border border-[#00F0C8]/40 bg-[#070E0E] p-6 shadow-2xl">
            <h3
              id="sheets-confirm-title"
              className="font-cyber text-base font-normal tracking-wide text-white uppercase"
            >
              Confirm Google Sheets Update
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-[#B6CCC8] sm:text-sm">
              {pendingAction.type === 'create_and_send' &&
                'Create a new formatted spreadsheet titled "SignalSure Analysis Log" in your Google Drive and write the organized header row' +
                  (previewRow ? ' plus this analysis result?' : '?')}
              {pendingAction.type === 'append_current' &&
                `Append 1 new organized row to "${pendingAction.target.title}" (${pendingAction.target.tabTitle})?`}
              {pendingAction.type === 'enable_auto_sync' &&
                `Automatically append a new organized row to "${pendingAction.target.title}" (${pendingAction.target.tabTitle}) whenever you complete an analysis in this session?`}
            </p>

            <div className="mt-4 space-y-2 rounded-[2px] border border-white/10 bg-[#030808] p-3.5 text-xs">
              <p className="text-[#8FA8A4]">
                <span className="font-semibold text-white">User Email:</span>{' '}
                {user?.email || 'Signed-in Google user'}
              </p>
              <p className="text-[#8FA8A4]">
                <span className="font-semibold text-white">Columns ({SHEET_HEADERS.length}):</span>{' '}
                {SHEET_HEADERS.slice(0, 6).join(', ')}, {SHEET_HEADERS.slice(6).join(', ')}
              </p>
              {previewRow && (
                <>
                  <p className="text-[#8FA8A4] [overflow-wrap:anywhere]">
                    <span className="font-semibold text-white">Applied Input:</span>{' '}
                    {previewRow[4].slice(0, 140)}
                    {previewRow[4].length > 140 ? '…' : ''}
                  </p>
                  <p className="text-[#8FA8A4]">
                    <span className="font-semibold text-white">Response Summary:</span>{' '}
                    {previewRow[7].slice(0, 160)}
                    {previewRow[7].length > 160 ? '…' : ''}
                  </p>
                </>
              )}
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="min-h-10 rounded-[2px] border border-white/15 bg-[#030808] px-4 py-2 text-xs font-medium text-[#C5DAD6] hover:border-white/30 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmClick()}
                className="min-h-10 rounded-[2px] bg-[#00F0C8] px-4 py-2 text-xs font-semibold tracking-wider text-[#031411] uppercase hover:bg-[#3BF7D8]"
              >
                Confirm & Write to Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
