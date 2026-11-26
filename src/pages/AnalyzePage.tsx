import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookmarkCheck,
  CheckCircle2,
  Database,
  Loader2,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useFirebaseAuth } from '../components/FirebaseProvider';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { AnalysisScanProgress } from '../components/AnalysisScanProgress';
import {
  GoogleSheetsSyncCard,
  type PendingSheetAction,
} from '../components/GoogleSheetsSyncCard';
import { ReportView } from '../components/ReportView';
import {
  buildScanTelemetryStages,
  MINIMUM_SCAN_DURATION_MS,
  type ScanStageDefinition,
} from '../lib/analysisTimeline';
import { analyzeWithDemoEngine, SAMPLE_CASES } from '../lib/demoAnalyzer';
import type { SavedScanItem } from '../lib/firestoreSchemas';
import {
  deleteScanReportRecord,
  saveScanReport,
  subscribeScanReports,
  updateScanReportRecord,
} from '../lib/firestoreStore';
import {
  appendRowToSignalSureSheet,
  buildAnalysisLogPayload,
  buildOrganizedSheetRow,
  createOrganizedSignalSureSheet,
  SheetsAuthError,
  type ConnectedSheetTarget,
} from '../lib/googleSheets';
import { isThreatAlertEligible } from '../lib/threatAlert';
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

interface StoredSheetPreference {
  target: ConnectedSheetTarget;
  autoSyncEnabled: boolean;
}

function sheetStorageKey(uid: string): string {
  return `signalsure.sheets.target.${uid}`;
}

export function AnalyzePage({
  capabilities,
  initialSampleId,
  onConsumeInitialSample,
}: AnalyzePageProps) {
  const {
    user,
    authReady,
    authLoading,
    signInWithGoogle,
    getSheetsAccessToken,
    requestSheetsAccess,
    clearSheetsAccessToken,
  } = useFirebaseAuth();
  const [inputKind, setInputKind] = useState<InputKind>('message');
  const [content, setContent] = useState('');
  const [engineMode, setEngineMode] = useState<'demo' | 'live'>('demo');
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [analyzedInput, setAnalyzedInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const [autoSaveHistory, setAutoSaveHistory] = useState(true);
  const [savedScans, setSavedScans] = useState<SavedScanItem[]>([]);
  const [savingCurrent, setSavingCurrent] = useState(false);
  const [currentSavedId, setCurrentSavedId] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [busyRecordId, setBusyRecordId] = useState<string | null>(null);

  // Google Sheets per-user target preference (non-secret ID & title only; access token stays strictly in memory)
  const [connectedSheet, setConnectedSheet] =
    useState<ConnectedSheetTarget | null>(null);
  const [autoSyncSheet, setAutoSyncSheet] = useState(false);
  const [sheetBusy, setSheetBusy] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [lastSheetSyncAt, setLastSheetSyncAt] = useState<string | null>(null);
  const [centralLogOptIn, setCentralLogOptIn] = useState(true);
  const [centralLogStatus, setCentralLogStatus] = useState<
    'idle' | 'sending' | 'sent' | 'skipped' | 'failed'
  >('idle');
  const [threatAlertOptIn, setThreatAlertOptIn] = useState(true);
  const [threatAlertStatus, setThreatAlertStatus] = useState<
    'idle' | 'sending' | 'sent' | 'skipped' | 'failed'
  >('idle');
  const [scanStages, setScanStages] = useState<ScanStageDefinition[]>([]);
  const [scanElapsedMs, setScanElapsedMs] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const requestSeqRef = useRef(0);

  const stopScanTimer = useCallback(() => {
    if (scanTimerRef.current !== null) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      stopScanTimer();
    };
  }, [stopScanTimer]);

  useEffect(() => {
    if (capabilities?.aiAnalyzerConfigured) {
      setEngineMode('live');
    }
  }, [capabilities?.aiAnalyzerConfigured]);

  useEffect(() => {
    if (!authReady || !user) {
      setConnectedSheet(null);
      setAutoSyncSheet(false);
      setSheetError(null);
      setLastSheetSyncAt(null);
      return;
    }

    try {
      const raw = window.localStorage.getItem(sheetStorageKey(user.uid));
      if (!raw) {
        setConnectedSheet(null);
        setAutoSyncSheet(false);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<StoredSheetPreference>;
      if (parsed?.target?.spreadsheetId) {
        setConnectedSheet(parsed.target);
        setAutoSyncSheet(Boolean(parsed.autoSyncEnabled));
      }
    } catch {
      setConnectedSheet(null);
      setAutoSyncSheet(false);
    }
  }, [authReady, user]);

  const saveSheetPreference = useCallback(
    (target: ConnectedSheetTarget | null, autoEnabled: boolean) => {
      if (!user) return;
      try {
        if (!target) {
          window.localStorage.removeItem(sheetStorageKey(user.uid));
        } else {
          const pref: StoredSheetPreference = {
            target,
            autoSyncEnabled: autoEnabled,
          };
          window.localStorage.setItem(
            sheetStorageKey(user.uid),
            JSON.stringify(pref)
          );
        }
      } catch {
        // Ignore storage quota errors
      }
    },
    [user]
  );

  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) {
      setSavedScans([]);
      return;
    }
    setHistoryError(null);
    const unsub = subscribeScanReports(
      user.uid,
      (items) => {
        setSavedScans(items);
        setNoteDrafts((prev) => {
          const next = { ...prev };
          for (const item of items) {
            if (!(item.id in next)) {
              next[item.id] = item.notes;
            }
          }
          return next;
        });
      },
      () => {
        setHistoryError('Unable to load saved scan history from Firestore right now.');
      }
    );
    return () => unsub();
  }, [authReady, user]);

  useEffect(() => {
    if (!initialSampleId) return;
    const found = SAMPLE_CASES.find((c) => c.id === initialSampleId);
    if (found) {
      setInputKind(found.inputKind);
      setContent(found.content);
      setValidationError(null);
      setApiError(null);
      setReport(null);
      setCurrentSavedId(null);
    }
    onConsumeInitialSample();
  }, [initialSampleId, onConsumeInitialSample]);

  const sensitiveWarning = content.trim()
    ? detectSensitiveDataWarning(content)
    : undefined;

  const persistScanIfSignedIn = async (
    rawInput: string,
    nextReport: AnalysisReport
  ) => {
    if (!user || !user.emailVerified) return;
    setSavingCurrent(true);
    setHistoryError(null);
    try {
      const id = await saveScanReport({
        userId: user.uid,
        rawInput,
        report: nextReport,
      });
      setCurrentSavedId(id);
    } catch {
      setHistoryError('Could not save this scan to Firestore right now.');
    } finally {
      setSavingCurrent(false);
    }
  };

  const syncAfterAnalysis = async (
    rawInput: string,
    nextReport: AnalysisReport
  ) => {
    // 1. Optional central master Google Sheet relay for aggregating every visitor's logs
    if (capabilities?.sheetsWebhookConfigured && centralLogOptIn) {
      setCentralLogStatus('sending');
      void fetch('/api/analysis-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          buildAnalysisLogPayload({
            rawInput,
            userEmail: user?.email,
            report: nextReport,
          })
        ),
      })
        .then(async (res) => {
          const data = (await res.json().catch(() => null)) as {
            forwarded?: boolean;
          } | null;
          setCentralLogStatus(res.ok && data?.forwarded ? 'sent' : 'failed');
        })
        .catch(() => {
          setCentralLogStatus('failed');
        });
    } else {
      setCentralLogStatus('skipped');
    }

    // 1b. Optional developer Gmail threat alert for verified High / Critical scans
    if (
      capabilities?.gmailAlertConfigured &&
      threatAlertOptIn &&
      user?.emailVerified &&
      isThreatAlertEligible(nextReport.riskLevel)
    ) {
      setThreatAlertStatus('sending');
      void user
        .getIdToken()
        .then((idToken) =>
          fetch('/api/threat-alert', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              rawInput,
              report: nextReport,
            }),
          })
        )
        .then(async (res) => {
          const data = (await res.json().catch(() => null)) as {
            sent?: boolean;
          } | null;
          setThreatAlertStatus(res.ok && data?.sent ? 'sent' : 'failed');
        })
        .catch(() => {
          setThreatAlertStatus('failed');
        });
    } else {
      setThreatAlertStatus('skipped');
    }

    // 2. Per-user Google Sheet auto-send (only when explicitly confirmed & in-memory token is active)
    if (!user || !autoSyncSheet || !connectedSheet) return;

    const accessToken = getSheetsAccessToken();
    if (!accessToken) {
      setSheetError(
        'Reconnect Google Sheets once in this session to resume automatic row logging.'
      );
      return;
    }

    setSheetBusy(true);
    setSheetError(null);
    try {
      const row = buildOrganizedSheetRow({
        rawInput,
        userEmail: user.email,
        report: nextReport,
      });
      const updatedTarget = await appendRowToSignalSureSheet(
        accessToken,
        connectedSheet.spreadsheetId,
        row
      );
      setConnectedSheet(updatedTarget);
      saveSheetPreference(updatedTarget, true);
      setLastSheetSyncAt(new Date().toISOString());
    } catch (err) {
      if (err instanceof SheetsAuthError) {
        clearSheetsAccessToken();
      }
      setSheetError(
        err instanceof Error
          ? err.message
          : 'Unable to append this analysis row to your Google Sheet.'
      );
    } finally {
      setSheetBusy(false);
    }
  };

  const handleConfirmSheetAction = async (action: PendingSheetAction) => {
    setSheetError(null);
    setSheetBusy(true);
    try {
      const accessToken = (await requestSheetsAccess()) || getSheetsAccessToken();
      if (!accessToken) {
        setSheetError(
          'Google Sheets permission is required before creating or writing to a spreadsheet.'
        );
        return;
      }

      const row =
        report && (analyzedInput || content.trim())
          ? buildOrganizedSheetRow({
              rawInput: analyzedInput || content.trim(),
              userEmail: user?.email,
              report,
            })
          : undefined;

      if (action.type === 'create_and_send') {
        const created = await createOrganizedSignalSureSheet(accessToken, row);
        setConnectedSheet(created);
        setAutoSyncSheet(true);
        saveSheetPreference(created, true);
        if (row) {
          setLastSheetSyncAt(new Date().toISOString());
        }
        return;
      }

      if (action.type === 'append_current') {
        if (!row) return;
        const updated = await appendRowToSignalSureSheet(
          accessToken,
          action.target.spreadsheetId,
          row
        );
        setConnectedSheet(updated);
        saveSheetPreference(updated, autoSyncSheet);
        setLastSheetSyncAt(new Date().toISOString());
        return;
      }

      if (action.type === 'enable_auto_sync') {
        if (row) {
          const updated = await appendRowToSignalSureSheet(
            accessToken,
            action.target.spreadsheetId,
            row
          );
          setConnectedSheet(updated);
          setAutoSyncSheet(true);
          saveSheetPreference(updated, true);
          setLastSheetSyncAt(new Date().toISOString());
        } else {
          setAutoSyncSheet(true);
          saveSheetPreference(action.target, true);
        }
      }
    } catch (err) {
      if (err instanceof SheetsAuthError) {
        clearSheetsAccessToken();
      }
      setSheetError(
        err instanceof Error
          ? err.message
          : 'Failed to update Google Sheets right now.'
      );
    } finally {
      setSheetBusy(false);
    }
  };

  const handleConnectExistingSheetId = (spreadsheetId: string) => {
    setSheetError(null);
    const target: ConnectedSheetTarget = {
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${encodeURIComponent(
        spreadsheetId
      )}/edit`,
      title: 'Linked Google Sheet',
      tabTitle: 'First tab / Analysis Log',
    };
    setConnectedSheet(target);
    setAutoSyncSheet(false);
    saveSheetPreference(target, false);
  };

  const handleDisconnectSheet = () => {
    setConnectedSheet(null);
    setAutoSyncSheet(false);
    setLastSheetSyncAt(null);
    setSheetError(null);
    saveSheetPreference(null, false);
  };

  const handleDisableAutoSync = () => {
    setAutoSyncSheet(false);
    saveSheetPreference(connectedSheet, false);
  };

  const waitWithAbort = (ms: number, signal: AbortSignal): Promise<void> =>
    new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      const timeoutId = window.setTimeout(() => {
        signal.removeEventListener('abort', onAbort);
        resolve();
      }, ms);
      const onAbort = () => {
        window.clearTimeout(timeoutId);
        reject(new DOMException('Aborted', 'AbortError'));
      };
      signal.addEventListener('abort', onAbort, { once: true });
    });

  const runAnalysis = async (requestedMode: 'demo' | 'live') => {
    setValidationError(null);
    setApiError(null);
    setHistoryError(null);
    setSheetError(null);
    setCentralLogStatus('idle');
    setThreatAlertStatus('idle');
    setCurrentSavedId(null);

    const check = validateAnalysisInput(content, inputKind);
    if (!check.valid) {
      setValidationError(check.error || 'Please check your input.');
      return;
    }

    abortControllerRef.current?.abort();
    stopScanTimer();
    const requestSeq = ++requestSeqRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const stages = buildScanTelemetryStages({
      inputKind,
      engineMode: requestedMode,
      content: check.normalizedContent,
    });
    setScanStages(stages);
    setScanElapsedMs(0);
    setLoading(true);

    const startedAt = Date.now();
    scanTimerRef.current = window.setInterval(() => {
      setScanElapsedMs(Date.now() - startedAt);
    }, 120);

    try {
      if (requestedMode === 'demo') {
        await waitWithAbort(MINIMUM_SCAN_DURATION_MS, controller.signal);
        if (requestSeq !== requestSeqRef.current) return;
        const demoResult = analyzeWithDemoEngine(check.normalizedContent, inputKind);
        setAnalyzedInput(check.normalizedContent);
        setReport(demoResult);
        if (autoSaveHistory && user?.emailVerified) {
          void persistScanIfSignedIn(check.normalizedContent, demoResult);
        }
        void syncAfterAnalysis(check.normalizedContent, demoResult);
        return;
      }

      const [response] = await Promise.all([
        fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            content: check.normalizedContent,
            inputKind,
          }),
        }),
        waitWithAbort(MINIMUM_SCAN_DURATION_MS, controller.signal),
      ]);

      const data = (await response.json().catch(() => null)) as {
        message?: unknown;
      } | null;
      if (requestSeq !== requestSeqRef.current) return;

      if (!response.ok || !data) {
        setApiError(
          typeof data?.message === 'string'
            ? data.message
            : 'Unable to complete live analysis.'
        );
        return;
      }

      const validated = validateAnalysisReport(data, 'live', inputKind);
      setAnalyzedInput(check.normalizedContent);
      setReport(validated);
      if (autoSaveHistory && user?.emailVerified) {
        void persistScanIfSignedIn(check.normalizedContent, validated);
      }
      void syncAfterAnalysis(check.normalizedContent, validated);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      if (requestSeq === requestSeqRef.current) {
        setApiError(
          'Network error reaching the SignalSure server. You can retry or switch to Demo Mode.'
        );
      }
    } finally {
      if (requestSeq === requestSeqRef.current) {
        stopScanTimer();
        setLoading(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runAnalysis(engineMode);
  };

  const handleClear = () => {
    requestSeqRef.current += 1;
    abortControllerRef.current?.abort();
    stopScanTimer();
    setLoading(false);
    setScanElapsedMs(0);
    setScanStages([]);
    setContent('');
    setAnalyzedInput('');
    setReport(null);
    setValidationError(null);
    setApiError(null);
    setSheetError(null);
    setCentralLogStatus('idle');
    setThreatAlertStatus('idle');
    setCurrentSavedId(null);
  };

  const handleSelectSample = (sampleId: string) => {
    const sample = SAMPLE_CASES.find((c) => c.id === sampleId);
    if (!sample) return;
    requestSeqRef.current += 1;
    abortControllerRef.current?.abort();
    stopScanTimer();
    setLoading(false);
    setScanElapsedMs(0);
    setScanStages([]);
    setInputKind(sample.inputKind);
    setContent(sample.content);
    setAnalyzedInput('');
    setValidationError(null);
    setApiError(null);
    setSheetError(null);
    setCentralLogStatus('idle');
    setThreatAlertStatus('idle');
    setReport(null);
    setCurrentSavedId(null);
  };

  const handleUpdateNoteOrStatus = async (
    item: SavedScanItem,
    nextStatus: 'active' | 'resolved'
  ) => {
    if (item.status === 'resolved') return;
    setBusyRecordId(item.id);
    setHistoryError(null);
    try {
      await updateScanReportRecord({
        reportId: item.id,
        notes: noteDrafts[item.id] ?? item.notes,
        status: nextStatus,
      });
    } catch {
      setHistoryError('Unable to update scan record.');
    } finally {
      setBusyRecordId(null);
    }
  };

  const handleDeleteRecord = async (reportId: string) => {
    setBusyRecordId(reportId);
    setHistoryError(null);
    try {
      await deleteScanReportRecord(reportId);
      if (currentSavedId === reportId) {
        setCurrentSavedId(null);
      }
    } catch {
      setHistoryError('Unable to delete scan record.');
    } finally {
      setBusyRecordId(null);
    }
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
        <div className="min-w-0 space-y-6 lg:col-span-5">
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
                disabled={!loading && !content && !report}
                className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-[2px] border border-white/15 bg-[#030808] px-4 py-2.5 text-xs font-medium text-[#B6CCC8] transition-colors hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
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

        {/* Right: Structured Report / Loading / Error / Empty State + Google Sheets Sync */}
        <div className="min-w-0 space-y-6 lg:col-span-7">
          {loading && (
            <AnalysisScanProgress
              stages={scanStages}
              elapsedMs={scanElapsedMs}
              engineMode={engineMode}
            />
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

          {!loading && !apiError && report && (
            <div className="space-y-4">
              {user?.emailVerified && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-white/10 bg-[#070E0E] px-4 py-3 text-xs">
                  <div className="flex items-center gap-2 text-[#B6CCC8]">
                    <BookmarkCheck className="h-4 w-4 text-[#00F0C8]" aria-hidden="true" />
                    {savingCurrent ? (
                      <span>Saving redacted scan summary to Firestore...</span>
                    ) : currentSavedId ? (
                      <span className="text-[#00F0C8]">
                        Saved privately to your Google account history.
                      </span>
                    ) : (
                      <span>Save this scan summary to your Google account history?</span>
                    )}
                  </div>
                  {!currentSavedId && !savingCurrent && (
                    <button
                      type="button"
                      onClick={() => void persistScanIfSignedIn(analyzedInput || content, report)}
                      className="rounded-[2px] border border-[#00F0C8]/45 bg-[#030808] px-3 py-1.5 font-medium text-[#00F0C8] hover:bg-[#00F0C8] hover:text-[#031411]"
                    >
                      Save to History
                    </button>
                  )}
                </div>
              )}
              <ReportView report={report} />
            </div>
          )}

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

          <GoogleSheetsSyncCard
            report={report}
            rawInput={analyzedInput || content.trim()}
            capabilities={capabilities}
            connectedSheet={connectedSheet}
            autoSyncEnabled={autoSyncSheet}
            sheetBusy={sheetBusy}
            sheetError={sheetError}
            lastSyncedAt={lastSheetSyncAt}
            centralLogStatus={centralLogStatus}
            centralLogOptIn={centralLogOptIn}
            onChangeCentralLogOptIn={setCentralLogOptIn}
            threatAlertStatus={threatAlertStatus}
            threatAlertOptIn={threatAlertOptIn}
            onChangeThreatAlertOptIn={setThreatAlertOptIn}
            onConnectExistingSheetId={handleConnectExistingSheetId}
            onDisconnectSheet={handleDisconnectSheet}
            onDisableAutoSync={handleDisableAutoSync}
            onConfirmAction={handleConfirmSheetAction}
          />
        </div>
      </div>

      {/* Saved Scan History (Firestore + Google Auth) */}
      <section
        aria-label="Saved analysis history"
        className="mt-10 rounded-[2px] border border-white/10 bg-[#070E0E] p-6"
      >
        <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <Database className="h-4 w-4 text-[#00F0C8]" aria-hidden="true" />
            <div>
              <h2 className="font-cyber text-base font-normal tracking-wide text-white uppercase">
                Saved Scan History
              </h2>
              <p className="mt-0.5 text-xs text-[#8FA8A4]">
                {user
                  ? `Private Firestore history for ${user.email}`
                  : 'Sign in with Google to save scan summaries and follow-up notes across sessions.'}
              </p>
            </div>
          </div>

          {user ? (
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[#C5DAD6]">
              <input
                type="checkbox"
                checked={autoSaveHistory}
                onChange={(e) => setAutoSaveHistory(e.target.checked)}
                className="h-4 w-4 accent-[#00F0C8]"
              />
              Auto-save new scans
            </label>
          ) : (
            <GoogleSignInButton
              loading={authLoading}
              onClick={() => void signInWithGoogle()}
              className="self-start"
            />
          )}
        </div>

        {historyError && (
          <p role="alert" className="mt-3 text-xs text-rose-300">
            {historyError}
          </p>
        )}

        {user && savedScans.length === 0 && (
          <p className="mt-4 text-sm text-[#8FA8A4]">
            No saved scans yet. Analyze any message or URL while signed in to
            store a redacted summary here.
          </p>
        )}

        {user && savedScans.length > 0 && (
          <ul className="mt-4 space-y-4">
            {savedScans.map((item) => {
              const isResolved = item.status === 'resolved';
              const isBusy = busyRecordId === item.id;
              return (
                <li
                  key={item.id}
                  className="rounded-[2px] border border-white/10 bg-[#030808] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`font-semibold ${
                            item.riskLevel === 'Critical'
                              ? 'text-rose-300'
                              : item.riskLevel === 'High'
                              ? 'text-amber-300'
                              : item.riskLevel === 'Medium'
                              ? 'text-amber-200'
                              : 'text-[#00F0C8]'
                          }`}
                        >
                          {item.riskLevel} Risk
                        </span>
                        <span className="text-[#5C736F]">·</span>
                        <span className="text-white">{item.category}</span>
                        <span className="text-[#5C736F]">·</span>
                        <span className="font-mono text-[#7E9692]">
                          {item.mode === 'live' ? 'Live AI' : 'Demo'} · {item.inputKind.toUpperCase()}
                        </span>
                      </div>
                      <p className="mt-1.5 font-mono text-xs text-[#8CEEE0] [overflow-wrap:anywhere]">
                        “{item.inputPreview}”
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-[2px] border px-2 py-0.5 text-[11px] font-medium ${
                          isResolved
                            ? 'border-[#00F0C8]/35 text-[#00F0C8]'
                            : 'border-white/15 text-[#A3B8B5]'
                        }`}
                      >
                        {isResolved ? 'Resolved' : 'Active'}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleDeleteRecord(item.id)}
                        disabled={isBusy}
                        aria-label={`Delete saved scan ${item.category}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[2px] border border-white/10 text-[#8FA8A4] hover:border-rose-400/50 hover:text-rose-300 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-[#B6CCC8]">
                    {item.summary}
                  </p>

                  <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row sm:items-center">
                    <label htmlFor={`scan-note-${item.id}`} className="sr-only">
                      Follow-up note for saved scan
                    </label>
                    <input
                      id={`scan-note-${item.id}`}
                      type="text"
                      value={noteDrafts[item.id] ?? item.notes}
                      disabled={isResolved || isBusy}
                      maxLength={500}
                      onChange={(e) =>
                        setNoteDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      placeholder={
                        isResolved
                          ? 'Resolved (note locked)'
                          : 'Add personal note (e.g. Verified via official bank app)...'
                      }
                      className="min-h-9 flex-1 rounded-[2px] border border-white/15 bg-[#070E0E] px-3 py-1.5 text-xs text-white placeholder:text-[#5C736F] focus:border-[#00F0C8] focus:outline-none disabled:opacity-60"
                    />
                    {!isResolved && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleUpdateNoteOrStatus(item, 'active')}
                          disabled={isBusy}
                          className="min-h-9 rounded-[2px] border border-white/15 bg-[#070E0E] px-3 py-1.5 text-xs font-medium text-[#E2EFEA] hover:border-[#00F0C8]/50 disabled:opacity-50"
                        >
                          Save note
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleUpdateNoteOrStatus(item, 'resolved')}
                          disabled={isBusy}
                          className="inline-flex min-h-9 items-center gap-1 rounded-[2px] bg-[#00F0C8]/15 px-3 py-1.5 text-xs font-medium text-[#00F0C8] hover:bg-[#00F0C8] hover:text-[#031411] disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Mark resolved
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
