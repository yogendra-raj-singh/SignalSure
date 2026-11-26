import { redactFullInputForSheet } from './googleSheets';
import type { InputKind } from './types';

export const MINIMUM_SCAN_DURATION_MS = 15_000;

export interface ScanStageDefinition {
  id: string;
  title: string;
  detail: string;
  targetHint: string;
  startMs: number;
  endMs: number;
}

export function extractInspectableHost(rawText: string): string | null {
  const urlMatch = rawText.match(/https?:\/\/[^\s<>"')]+/i);
  const domainMatch = rawText.match(
    /\b([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.(?:com|in|org|net|xyz|top|info|co\.in|gov\.in|nic\.in|online|site|club|link)(?:\/[^\s]*)?)\b/i
  );

  const candidate = urlMatch?.[0] || domainMatch?.[1];
  if (!candidate) return null;

  try {
    const normalized = /^https?:\/\//i.test(candidate)
      ? candidate
      : `https://${candidate}`;
    const parsed = new URL(normalized);
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function buildScanTelemetryStages(params: {
  inputKind: InputKind;
  engineMode: 'live' | 'demo';
  content: string;
}): ScanStageDefinition[] {
  const host = extractInspectableHost(params.content);
  const redactedPreview = redactFullInputForSheet(params.content, 64);
  const isUrl = params.inputKind === 'url' || Boolean(host);

  return [
    {
      id: 'parse',
      title: 'Parsing & isolating submission',
      detail:
        'Wrapping submitted content in an untrusted boundary and redacting sensitive digits.',
      targetHint: `Input · "${redactedPreview}"`,
      startMs: 0,
      endMs: 2500,
    },
    {
      id: 'link',
      title: isUrl
        ? `Inspecting link & domain structure${host ? ` (${host})` : ''}`
        : 'Scanning embedded links & sender handles',
      detail: host
        ? `Checking ${host} against lookalike domains, risky TLDs, and redirect cues.`
        : 'Checking text for hidden short links, spoofed sender headers, and phone lures.',
      targetHint: host ? `Target host · ${host}` : 'Scanning URL & contact patterns',
      startMs: 2500,
      endMs: 5500,
    },
    {
      id: 'web',
      title:
        params.engineMode === 'live'
          ? 'Surfing web advisories & official domains'
          : 'Matching documented Indian scam patterns',
      detail:
        params.engineMode === 'live'
          ? 'Consulting live Google Search results for RBI, NPCI, CyberDost, and official brand portals.'
          : 'Checking local signature patterns across RBI, KYC, UPI, and job scam scripts.',
      targetHint: 'Cross-checking official Indian portals',
      startMs: 5500,
      endMs: 9000,
    },
    {
      id: 'psychology',
      title: 'Evaluating social-engineering signals',
      detail:
        'Detecting artificial deadlines, authority impersonation, QR/PIN requests, and advance-fee lures.',
      targetHint: 'Extracting verbatim phrase evidence',
      startMs: 9000,
      endMs: 11800,
    },
    {
      id: 'gaps',
      title: 'Separating evidence from unverified gaps',
      detail:
        'Listing claims that cannot be proven from message text alone without official app verification.',
      targetHint: 'Verifying confidence boundaries',
      startMs: 11800,
      endMs: 13800,
    },
    {
      id: 'compile',
      title: 'Compiling structured safety report',
      detail:
        'Organizing risk tier, recommended next steps, and 1930 helpline guidance.',
      targetHint: 'Finalizing clean report layout',
      startMs: 13800,
      endMs: 15000,
    },
  ];
}

export function getActiveScanStageIndex(
  elapsedMs: number,
  stages: ScanStageDefinition[]
): number {
  if (stages.length === 0) return 0;
  for (let i = 0; i < stages.length; i++) {
    if (elapsedMs < stages[i].endMs) {
      return i;
    }
  }
  return stages.length - 1;
}

export function computeScanProgressPercent(
  elapsedMs: number,
  durationMs = MINIMUM_SCAN_DURATION_MS
): number {
  if (elapsedMs <= 0) return 4;
  if (elapsedMs >= durationMs) return 96;
  const ratio = elapsedMs / durationMs;
  return Math.min(96, Math.max(4, Math.round(4 + ratio * 92)));
}
