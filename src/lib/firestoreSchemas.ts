import type { AnalysisReport, IncidentReportInput } from './types';

export const BLUEPRINT_LIMITS = {
  UID_MAX: 128,
  DISPLAY_NAME_MAX: 120,
  EMAIL_MAX: 200,
  PHOTO_URL_MAX: 500,
  PREVIEW_MAX: 220,
  CATEGORY_MAX: 80,
  SUMMARY_MAX: 700,
  RESEARCH_SUMMARY_MAX: 1000,
  EVIDENCE_COUNT_MAX: 20,
  NOTES_MAX: 500,
  REF_ID_MAX: 32,
  SCAM_TYPE_MAX: 100,
  CHANNEL_MAX: 60,
  DATE_MAX: 32,
  DESCRIPTION_MIN: 20,
  DESCRIPTION_MAX: 2500,
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  REF_ID_PATTERN: /^SS-[A-Z0-9]+$/,
} as const;

export interface SavedScanItem {
  id: string;
  ownerId: string;
  inputKind: 'message' | 'url';
  inputPreview: string;
  mode: 'live' | 'demo';
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  category: string;
  summary: string;
  researchSummary: string;
  evidenceCount: number;
  notes: string;
  status: 'active' | 'resolved';
  createdAtMs: number;
}

export interface SavedIncidentItem {
  id: string;
  ownerId: string;
  referenceId: string;
  scamType: string;
  channel: string;
  approximateDate: string;
  description: string;
  contactEmail: string;
  submissionMode: 'live' | 'demo';
  status: 'submitted' | 'archived';
  createdAtMs: number;
}

export function sanitizeFirestoreId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, BLUEPRINT_LIMITS.UID_MAX);
  return cleaned || `rec_${Date.now()}`;
}

export function redactInputPreview(rawText: string): string {
  const normalized = rawText
    .replace(/\s+/g, ' ')
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{3,4}\b/g, '[REDACTED-CARD]')
    .replace(
      /\b(otp|pin|upi\s*pin|cvv|password|mpin)\s*(?:is|:|=)\s*[a-z0-9*#-]{3,12}\b/gi,
      '$1: [REDACTED]'
    )
    .trim();

  if (!normalized) return 'Submitted excerpt';
  if (normalized.length <= BLUEPRINT_LIMITS.PREVIEW_MAX) return normalized;
  return `${normalized.slice(0, BLUEPRINT_LIMITS.PREVIEW_MAX - 1)}…`;
}

export function buildUserProfileFields(params: {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}) {
  const uid = params.uid.trim().slice(0, BLUEPRINT_LIMITS.UID_MAX);
  if (!BLUEPRINT_LIMITS.ID_PATTERN.test(uid)) {
    throw new Error('Invalid user UID format.');
  }
  const email = (params.email || '').trim().slice(0, BLUEPRINT_LIMITS.EMAIL_MAX);
  if (email.length < 3) {
    throw new Error('Verified Google email address is required.');
  }
  const displayName = (params.displayName || email.split('@')[0] || 'SignalSure User')
    .trim()
    .slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX);
  const photoUrl = (params.photoURL || '').trim().slice(0, BLUEPRINT_LIMITS.PHOTO_URL_MAX);

  return {
    uid,
    displayName: displayName || 'SignalSure User',
    email,
    photoUrl,
  };
}

export function buildScanReportPayload(params: {
  ownerId: string;
  rawInput: string;
  report: AnalysisReport;
  notes?: string;
}) {
  const ownerId = params.ownerId.trim().slice(0, BLUEPRINT_LIMITS.UID_MAX);
  if (!BLUEPRINT_LIMITS.ID_PATTERN.test(ownerId)) {
    throw new Error('Invalid ownerId.');
  }
  return {
    ownerId,
    inputKind: params.report.inputKind === 'url' ? ('url' as const) : ('message' as const),
    inputPreview: redactInputPreview(params.rawInput),
    mode: params.report.mode === 'live' ? ('live' as const) : ('demo' as const),
    riskLevel: params.report.riskLevel,
    category: params.report.category.trim().slice(0, BLUEPRINT_LIMITS.CATEGORY_MAX) || 'General',
    summary:
      params.report.summary.trim().slice(0, BLUEPRINT_LIMITS.SUMMARY_MAX) ||
      'AI-assisted assessment summary.',
    researchSummary: (params.report.researchSummary || '')
      .trim()
      .slice(0, BLUEPRINT_LIMITS.RESEARCH_SUMMARY_MAX),
    evidenceCount: Math.min(
      BLUEPRINT_LIMITS.EVIDENCE_COUNT_MAX,
      Math.max(0, Math.floor(params.report.observedEvidence.length))
    ),
    notes: (params.notes || '').trim().slice(0, BLUEPRINT_LIMITS.NOTES_MAX),
    status: 'active' as const,
  };
}

export function buildIncidentReportPayload(params: {
  ownerId: string;
  referenceId: string;
  input: IncidentReportInput;
  submissionMode: 'live' | 'demo';
}) {
  const ownerId = params.ownerId.trim().slice(0, BLUEPRINT_LIMITS.UID_MAX);
  if (!BLUEPRINT_LIMITS.ID_PATTERN.test(ownerId)) {
    throw new Error('Invalid ownerId.');
  }

  const refRaw = params.referenceId.trim().toUpperCase().slice(0, BLUEPRINT_LIMITS.REF_ID_MAX);
  const referenceId = BLUEPRINT_LIMITS.REF_ID_PATTERN.test(refRaw)
    ? refRaw
    : `SS-${Date.now().toString(36).toUpperCase()}`;

  const description = params.input.description
    .trim()
    .slice(0, BLUEPRINT_LIMITS.DESCRIPTION_MAX);
  if (description.length < BLUEPRINT_LIMITS.DESCRIPTION_MIN) {
    throw new Error('Incident description must be at least 20 characters.');
  }

  return {
    ownerId,
    referenceId,
    scamType: params.input.scamType.trim().slice(0, BLUEPRINT_LIMITS.SCAM_TYPE_MAX),
    channel: params.input.channel.trim().slice(0, BLUEPRINT_LIMITS.CHANNEL_MAX),
    approximateDate: params.input.approximateDate.trim().slice(0, BLUEPRINT_LIMITS.DATE_MAX),
    description,
    contactEmail: (params.input.contactEmail || '')
      .trim()
      .slice(0, BLUEPRINT_LIMITS.EMAIL_MAX),
    submissionMode: params.submissionMode === 'live' ? ('live' as const) : ('demo' as const),
    status: 'submitted' as const,
  };
}
