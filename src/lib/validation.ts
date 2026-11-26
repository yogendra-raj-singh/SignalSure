import type {
  AnalysisReport,
  EvidenceSignal,
  IncidentReportInput,
  InputKind,
  ResearchSource,
  RiskLevel,
  ScamCategory,
} from './types';

export const MAX_ANALYSIS_LENGTH = 4000;
export const MIN_MESSAGE_LENGTH = 10;
export const MIN_URL_LENGTH = 4;

const VALID_RISK_LEVELS: ReadonlyArray<RiskLevel> = [
  'Low',
  'Medium',
  'High',
  'Critical',
];

const VALID_CATEGORIES: ReadonlyArray<ScamCategory> = [
  'UPI & Payment Fraud',
  'KYC & Banking Impersonation',
  'Fake Job & Task Scam',
  'Phishing & Credential Harvesting',
  'Delivery & Customs Scam',
  'Investment & Crypto Scam',
  'Tech Support & Remote Access',
  'Suspicious / Unverified Claim',
  'General Digital Communication',
];

export const DEFAULT_DISCLAIMER =
  'AI-assisted assessment only — not proof that a message, offer, or link is fraudulent or safe. No automated tool detects 100% of scams.';

export const INDIA_EMERGENCY_GUIDANCE =
  'If you have shared banking credentials, authorized an unknown UPI transfer, or lost money in India, call the National Cyber Crime Helpline at 1930 immediately and file a complaint on https://cybercrime.gov.in. You can also report unsolicited fraud communications via Sanchar Saathi Chakshu (https://sancharsaathi.gov.in/sfc/).';

export interface InputValidationResult {
  valid: boolean;
  error?: string;
  sensitiveWarning?: string;
  normalizedContent: string;
}

export function detectSensitiveDataWarning(text: string): string | undefined {
  const lower = text.toLowerCase();

  // Check for explicit 15-16 digit card numbers (with spaces or hyphens)
  if (/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{3,4}\b/.test(text)) {
    return 'Your input appears to contain a 15–16 digit card-like number. Remove any card numbers, CVVs, or account details before submitting.';
  }

  // Check for explicit OTP / PIN / CVV / password sharing phrases with values
  if (
    /\b(?:my\s+(?:otp|pin|upi\s*pin|cvv|password|mpin)\s*(?:is|:|=)\s*[a-z0-9*#-]{3,12})\b/i.test(
      lower
    )
  ) {
    return 'Never paste your own OTP, UPI PIN, ATM PIN, CVV, or password into SignalSure. Please redact personal secrets before analyzing.';
  }

  return undefined;
}

export function validateAnalysisInput(
  rawContent: string,
  inputKind: InputKind
): InputValidationResult {
  const normalized = rawContent.trim();

  if (!normalized) {
    return {
      valid: false,
      error:
        inputKind === 'url'
          ? 'Enter a suspicious URL or domain to analyze.'
          : 'Paste a suspicious SMS, WhatsApp message, email, or offer to analyze.',
      normalizedContent: '',
    };
  }

  if (normalized.length > MAX_ANALYSIS_LENGTH) {
    return {
      valid: false,
      error: `Input exceeds the ${MAX_ANALYSIS_LENGTH.toLocaleString()} character limit. Please shorten it to the relevant excerpt.`,
      normalizedContent: normalized,
    };
  }

  if (inputKind === 'url') {
    if (normalized.length < MIN_URL_LENGTH || /\s/.test(normalized)) {
      return {
        valid: false,
        error: 'Enter a single valid URL or domain without spaces (e.g., https://example.com/verify).',
        normalizedContent: normalized,
      };
    }

    const candidate = /^https?:\/\//i.test(normalized)
      ? normalized
      : `https://${normalized}`;

    try {
      const parsed = new URL(candidate);
      if (!parsed.hostname.includes('.') || parsed.hostname.length < 4) {
        return {
          valid: false,
          error: 'Enter a complete domain or web address (for example, example.com/login).',
          normalizedContent: normalized,
        };
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return {
          valid: false,
          error: 'Only http:// and https:// web links can be analyzed here.',
          normalizedContent: normalized,
        };
      }
    } catch {
      return {
        valid: false,
        error: 'That does not look like a valid web address. Check for typos and try again.',
        normalizedContent: normalized,
      };
    }
  } else if (normalized.length < MIN_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Paste at least ${MIN_MESSAGE_LENGTH} characters so there is enough context to evaluate.`,
      normalizedContent: normalized,
    };
  }

  const sensitiveWarning = detectSensitiveDataWarning(normalized);

  return {
    valid: true,
    sensitiveWarning,
    normalizedContent: normalized,
  };
}

export function validateAnalysisReport(
  raw: unknown,
  fallbackMode: 'live' | 'demo',
  inputKind: InputKind
): AnalysisReport {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Analysis response was not a structured object.');
  }

  const data = raw as Record<string, unknown>;

  const riskLevel: RiskLevel = VALID_RISK_LEVELS.includes(data.riskLevel as RiskLevel)
    ? (data.riskLevel as RiskLevel)
    : 'Medium';

  const category: ScamCategory = VALID_CATEGORIES.includes(data.category as ScamCategory)
    ? (data.category as ScamCategory)
    : 'Suspicious / Unverified Claim';

  const summary =
    typeof data.summary === 'string' && data.summary.trim().length > 0
      ? data.summary.trim()
      : 'Insufficient context to confirm legitimacy; treat unsolicited requests with caution.';

  const rawEvidence = Array.isArray(data.observedEvidence) ? data.observedEvidence : [];
  const observedEvidence: EvidenceSignal[] = rawEvidence
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => {
      const sev: EvidenceSignal['severity'] =
        item.severity === 'critical' || item.severity === 'high' || item.severity === 'caution'
          ? item.severity
          : 'caution';
      return {
        indicatorType:
          typeof item.indicatorType === 'string' && item.indicatorType.trim()
            ? item.indicatorType.trim()
            : 'Observed indicator',
        quotedPhrase:
          typeof item.quotedPhrase === 'string' && item.quotedPhrase.trim()
            ? item.quotedPhrase.trim().slice(0, 220)
            : 'See submitted text',
        whyItMatters:
          typeof item.whyItMatters === 'string' && item.whyItMatters.trim()
            ? item.whyItMatters.trim()
            : 'This pattern frequently appears in deceptive outreach.',
        severity: sev,
      };
    })
    .slice(0, 8);

  const toStringList = (val: unknown, fallback: string[]): string[] => {
    if (!Array.isArray(val)) return fallback;
    const cleaned = val
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .map((v) => v.trim());
    return cleaned.length > 0 ? cleaned.slice(0, 6) : fallback;
  };

  const informationGaps = toStringList(data.informationGaps, [
    'SignalSure cannot independently verify the true sender identity, phone number registration, or live domain reputation from text alone.',
  ]);

  const recommendedNextSteps = toStringList(data.recommendedNextSteps, [
    'Pause before clicking links, replying, scanning QR codes, or sharing any code.',
    'Independently verify using the organization’s official app or published helpline number.',
  ]);

  const verificationGuidance =
    typeof data.verificationGuidance === 'string' && data.verificationGuidance.trim()
      ? data.verificationGuidance.trim()
      : 'Always open the official website or app directly via a trusted bookmark rather than using links or phone numbers provided inside an unexpected message.';

  const indiaEmergencyGuidance =
    typeof data.indiaEmergencyGuidance === 'string' && data.indiaEmergencyGuidance.trim()
      ? data.indiaEmergencyGuidance.trim()
      : INDIA_EMERGENCY_GUIDANCE;

  const researchSummary =
    typeof data.researchSummary === 'string' && data.researchSummary.trim()
      ? data.researchSummary.trim().slice(0, 1000)
      : undefined;

  const researchQueries = Array.isArray(data.researchQueries)
    ? Array.from(
        new Set(
          data.researchQueries
            .filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
            .map((q) => q.trim().slice(0, 140))
        )
      ).slice(0, 5)
    : undefined;

  const researchSources = sanitizeResearchSources(data.researchSources);

  return {
    mode: data.mode === 'live' || data.mode === 'demo' ? data.mode : fallbackMode,
    modelLabel: typeof data.modelLabel === 'string' ? data.modelLabel : undefined,
    analyzedAt:
      typeof data.analyzedAt === 'string' && data.analyzedAt
        ? data.analyzedAt
        : new Date().toISOString(),
    inputKind,
    riskLevel,
    category,
    summary,
    researchSummary,
    researchQueries: researchQueries && researchQueries.length > 0 ? researchQueries : undefined,
    researchSources: researchSources.length > 0 ? researchSources : undefined,
    observedEvidence,
    informationGaps,
    recommendedNextSteps,
    verificationGuidance,
    indiaEmergencyGuidance,
    disclaimer: DEFAULT_DISCLAIMER,
  };
}

export function validateIncidentInput(input: IncidentReportInput): {
  valid: boolean;
  errors: Partial<Record<keyof IncidentReportInput, string>>;
} {
  const errors: Partial<Record<keyof IncidentReportInput, string>> = {};

  const scamType = input.scamType.trim();
  if (scamType.length < 2 || scamType.length > 100) {
    errors.scamType = 'Select the scam or threat category.';
  }

  const channel = input.channel.trim();
  if (channel.length < 2 || channel.length > 60) {
    errors.channel = 'Select where you encountered the message or link.';
  }

  const approxDate = input.approximateDate.trim();
  if (approxDate.length < 4 || approxDate.length > 32) {
    errors.approximateDate = 'Provide an approximate date.';
  } else {
    const parsed = Date.parse(approxDate);
    if (Number.isNaN(parsed)) {
      errors.approximateDate = 'Enter a valid date.';
    }
  }

  const desc = input.description.trim();
  if (desc.length < 20) {
    errors.description = 'Describe what happened in at least 20 characters (without sensitive credentials).';
  } else if (desc.length > 2500) {
    errors.description = 'Keep the description under 2,500 characters.';
  } else if (detectSensitiveDataWarning(desc)) {
    errors.description =
      'Please remove any card numbers, CVVs, PINs, or OTPs before submitting this report.';
  }

  if (input.contactEmail && input.contactEmail.trim()) {
    const email = input.contactEmail.trim();
    const emailValid = email.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailValid) {
      errors.contactEmail = 'Enter a valid email address (max 200 chars) or leave this field blank.';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function sanitizeExternalUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:') {
      return null;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '169.254.169.254' ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function sanitizeResearchSources(rawSources: unknown): ResearchSource[] {
  if (!Array.isArray(rawSources)) return [];
  const seenUrls = new Set<string>();
  const cleaned: ResearchSource[] = [];

  for (const item of rawSources) {
    if (!item || typeof item !== 'object') continue;
    const record = item as { title?: unknown; url?: unknown; uri?: unknown };
    const candidateUrl =
      typeof record.url === 'string'
        ? record.url
        : typeof record.uri === 'string'
        ? record.uri
        : '';
    const safeUrl = sanitizeExternalUrl(candidateUrl);
    if (!safeUrl || seenUrls.has(safeUrl)) continue;
    seenUrls.add(safeUrl);

    let title = typeof record.title === 'string' ? record.title.trim().slice(0, 120) : '';
    if (!title) {
      try {
        title = new URL(safeUrl).hostname;
      } catch {
        title = 'Verified web source';
      }
    }
    cleaned.push({ title, url: safeUrl });
    if (cleaned.length >= 6) break;
  }

  return cleaned;
}

export function extractGroundingSources(groundingMetadata: unknown): {
  researchSources: ResearchSource[];
  researchQueries: string[];
} {
  if (!groundingMetadata || typeof groundingMetadata !== 'object') {
    return { researchSources: [], researchQueries: [] };
  }

  const meta = groundingMetadata as {
    groundingChunks?: Array<{ web?: { uri?: unknown; title?: unknown } }>;
    webSearchQueries?: unknown[];
  };

  const rawSourceCandidates = Array.isArray(meta.groundingChunks)
    ? meta.groundingChunks
        .map((chunk) =>
          chunk?.web
            ? { title: chunk.web.title, url: chunk.web.uri }
            : null
        )
        .filter((x): x is { title: unknown; url: unknown } => Boolean(x))
    : [];

  const researchSources = sanitizeResearchSources(rawSourceCandidates);

  const researchQueries = Array.isArray(meta.webSearchQueries)
    ? Array.from(
        new Set(
          meta.webSearchQueries
            .filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
            .map((q) => q.trim().slice(0, 140))
        )
      ).slice(0, 5)
    : [];

  return { researchSources, researchQueries };
}
