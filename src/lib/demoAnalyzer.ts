import type {
  AnalysisReport,
  EvidenceSignal,
  InputKind,
  RiskLevel,
  SampleCase,
  ScamCategory,
} from './types';
import {
  DEFAULT_DISCLAIMER,
  INDIA_EMERGENCY_GUIDANCE,
} from './validation';

export const SAMPLE_CASES: SampleCase[] = [
  {
    id: 'kyc-sms',
    title: 'Bank KYC Suspension SMS',
    channel: 'SMS',
    inputKind: 'message',
    shortDescription: 'Urgent account freeze threat with an unofficial verification link.',
    content:
      'Dear Customer, your SBI YONO account KYC is expired today and will be blocked within 2 hours. Update PAN immediately at http://sbi-kyc-verify-portal.xyz/login or call +91-98XXX-11209 to avoid suspension.',
  },
  {
    id: 'upi-collect',
    title: 'UPI Collect / Marketplace Refund',
    channel: 'WhatsApp',
    inputKind: 'message',
    shortDescription: 'Buyer asks seller to approve a UPI request or scan QR to receive money.',
    content:
      'Hi, I am army officer transferring Rs 14,500 advance for your sofa right now. I have sent a UPI payment request on PhonePe. Please click Accept and enter your UPI PIN to receive the amount in your bank.',
  },
  {
    id: 'task-job',
    title: 'Telegram / WhatsApp Task Job',
    channel: 'WhatsApp / Telegram',
    inputKind: 'message',
    shortDescription: 'High daily pay for liking videos followed by prepaid task deposits.',
    content:
      'Congratulations! Your number was shortlisted by HR for flexible part-time remote work. Earn Rs 2,500 to Rs 6,000 daily by rating merchant hotels on Maps. Join our Telegram receptionist @hr_desk_rewards and complete 3 prepaid welfare tasks to unlock withdrawal.',
  },
  {
    id: 'customs-link',
    title: 'Suspicious Courier / Customs URL',
    channel: 'URL',
    inputKind: 'url',
    shortDescription: 'Lookalike tracking domain requesting customs fee payment.',
    content: 'https://indiapost-parcel-clearance-fee.top/track?awb=IN8839201',
  },
  {
    id: 'low-signal-notice',
    title: 'Short Ambiguous Reminder',
    channel: 'SMS',
    inputKind: 'message',
    shortDescription: 'Brief message without obvious scam keywords, showing honest uncertainty.',
    content:
      'Reminder: Your annual maintenance invoice INV-402 is ready. View details through your resident portal or contact the society office desk during working hours.',
  },
];

interface PatternRule {
  indicatorType: string;
  regex: RegExp;
  whyItMatters: string;
  severity: 'caution' | 'high' | 'critical';
  weight: number;
  categoryHint?: ScamCategory;
}

const PATTERN_RULES: PatternRule[] = [
  {
    indicatorType: 'Credential or UPI PIN request',
    regex: /\b(?:enter\s+(?:your\s+)?(?:upi\s*)?pin|share\s+(?:your\s+)?otp|cvv|mpin|password|atm\s*pin)\b/i,
    whyItMatters:
      'Legitimate banks, payment apps, and buyers never ask you to enter your UPI PIN or share an OTP to receive money.',
    severity: 'critical',
    weight: 45,
    categoryHint: 'UPI & Payment Fraud',
  },
  {
    indicatorType: 'False premise for receiving money',
    regex: /\b(?:accept|approve|scan\s+(?:the\s+)?qr).{0,45}\b(?:receive|credit|get\s+the\s+amount|refund)\b/i,
    whyItMatters:
      'Approving a UPI collect request or entering a PIN always sends money out of your account; receiving money requires no PIN.',
    severity: 'critical',
    weight: 45,
    categoryHint: 'UPI & Payment Fraud',
  },
  {
    indicatorType: 'Urgent account freeze or deadline',
    regex: /\b(?:blocked\s+within\s+\d+|suspended\s+today|expired\s+today|immediately|within\s+2\s+hours|last\s+warning|deactivated)\b/i,
    whyItMatters:
      'Artificial deadlines are used to pressure you into acting before checking with your bank or service provider.',
    severity: 'high',
    weight: 28,
    categoryHint: 'KYC & Banking Impersonation',
  },
  {
    indicatorType: 'Bank or KYC impersonation cue',
    regex: /\b(?:kyc\s+(?:is\s+)?expired|update\s+pan|sbi\s+yono|hdfc|icici|axis\s+bank|rbi|income\s+tax|trai|telecom\s+department|customs\s+clearance)\b/i,
    whyItMatters:
      'Scammers frequently impersonate major banks, telecom regulators, or customs officials to borrow authority.',
    severity: 'high',
    weight: 25,
    categoryHint: 'KYC & Banking Impersonation',
  },
  {
    indicatorType: 'Prepaid task or unrealistic job earnings',
    regex: /\b(?:earn\s+rs\.?\s*[\d,]+.{0,30}(?:daily|day|hour)|prepaid\s+(?:welfare\s+)?task|unlock\s+withdrawal|rating\s+merchant|liking\s+videos)\b/i,
    whyItMatters:
      'Task scams advertise easy daily payouts on WhatsApp or Telegram and then demand escalating "prepaid" deposits to release earnings.',
    severity: 'critical',
    weight: 40,
    categoryHint: 'Fake Job & Task Scam',
  },
  {
    indicatorType: 'Off-platform messaging redirect',
    regex: /(?:telegram|whatsapp|@[a-z0-9_]{4,}|wa\.me\/)/i,
    whyItMatters:
      'Shifting conversations onto private Telegram handles or personal WhatsApp numbers makes impersonators harder to trace.',
    severity: 'caution',
    weight: 16,
    categoryHint: 'Fake Job & Task Scam',
  },
  {
    indicatorType: 'Unusual or lookalike web link',
    regex: /https?:\/\/[^\s]+(?:\.xyz|\.top|\.buzz|\.click|\.tk|\.ml|verify|kyc|clearance|login|update)[^\s]*/i,
    whyItMatters:
      'Lookalike domains or low-cost generic extensions (.xyz, .top) combined with words like verify, kyc, or login often host credential-harvesting pages.',
    severity: 'high',
    weight: 30,
    categoryHint: 'Phishing & Credential Harvesting',
  },
  {
    indicatorType: 'Generic non-branded URL or shortener',
    regex: /(?:bit\.ly|tinyurl\.com|rb\.gy|t\.co|cutt\.ly|https?:\/\/\d{1,3}(?:\.\d{1,3}){3})/i,
    whyItMatters:
      'Shortened links or raw IP addresses hide the true destination website until after you click.',
    severity: 'high',
    weight: 26,
    categoryHint: 'Phishing & Credential Harvesting',
  },
  {
    indicatorType: 'Remote access or APK install request',
    regex: /\b(?:anydesk|teamviewer|quicksupport|rustdesk|download\s+(?:the\s+)?apk|\.apk)\b/i,
    whyItMatters:
      'Installing unknown APK files or screen-sharing apps can expose your OTPs, SMS messages, and banking apps.',
    severity: 'critical',
    weight: 45,
    categoryHint: 'Tech Support & Remote Access',
  },
  {
    indicatorType: 'Trust-borrowing personal claim',
    regex: /\b(?:army\s+officer|cisf|military|government\s+officer|guaranteed\s+returns|double\s+your\s+money)\b/i,
    whyItMatters:
      'Claiming uniformed service or guaranteed financial returns is a well-documented social engineering tactic to bypass skepticism.',
    severity: 'high',
    weight: 25,
  },
];

function extractQuotedPhrase(text: string, matchIndex: number, matchText: string): string {
  let start = Math.max(0, matchIndex - 14);
  let end = Math.min(text.length, matchIndex + matchText.length + 14);

  // Snap start backward/forward to a clean word boundary
  if (start > 0 && !/\s/.test(text[start - 1])) {
    const prevSpace = text.lastIndexOf(' ', start);
    start = prevSpace >= 0 ? prevSpace + 1 : 0;
  }

  // Snap end forward to the end of the current word
  if (end < text.length && !/\s/.test(text[end])) {
    const nextSpace = text.indexOf(' ', end);
    end = nextSpace >= 0 ? nextSpace : text.length;
  }

  let slice = text.slice(start, end).trim().replace(/^[,.;:]+|[,.;:]+$/g, '');
  if (slice.length > 140) {
    slice = matchText.trim();
  }
  return slice;
}

export function analyzeWithDemoEngine(
  content: string,
  inputKind: InputKind
): AnalysisReport {
  const trimmed = content.trim();
  const evidence: EvidenceSignal[] = [];
  let score = 0;
  let detectedCategory: ScamCategory =
    inputKind === 'url'
      ? 'Phishing & Credential Harvesting'
      : 'General Digital Communication';

  for (const rule of PATTERN_RULES) {
    const match = rule.regex.exec(trimmed);
    if (match) {
      score += rule.weight;
      evidence.push({
        indicatorType: rule.indicatorType,
        quotedPhrase: extractQuotedPhrase(trimmed, match.index, match[0]),
        whyItMatters: rule.whyItMatters,
        severity: rule.severity,
      });
      if (rule.categoryHint && detectedCategory === 'General Digital Communication') {
        detectedCategory = rule.categoryHint;
      } else if (rule.categoryHint && rule.severity === 'critical') {
        detectedCategory = rule.categoryHint;
      }
    }
  }

  // URL-specific structural inspection (honest, non-fabricated)
  if (inputKind === 'url') {
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const parsed = new URL(candidate);
      const host = parsed.hostname.toLowerCase();
      if (/indiapost|parcel|customs|fedex|bluedart|delhivery/i.test(host) && !host.endsWith('indiapost.gov.in')) {
        detectedCategory = 'Delivery & Customs Scam';
        score += 25;
      }
      if (host.split('-').length >= 3 || host.split('.').length >= 4) {
        score += 18;
        evidence.push({
          indicatorType: 'Multi-hyphen or deep subdomain structure',
          quotedPhrase: host,
          whyItMatters:
            'Legitimate Indian banks and public services rarely host login or payment clearance portals on multi-hyphen lookalike domains.',
          severity: 'high',
        });
      }
      if (parsed.protocol === 'http:') {
        score += 12;
        evidence.push({
          indicatorType: 'Unencrypted HTTP link',
          quotedPhrase: parsed.origin,
          whyItMatters:
            'Official banking, KYC, and government payment portals use HTTPS encryption rather than plain HTTP.',
          severity: 'caution',
        });
      }
    } catch {
      // Handled upstream by validation
    }
  }

  // Deduplicate similar quoted phrases
  const dedupedEvidence = evidence.filter(
    (item, idx, arr) =>
      arr.findIndex((other) => other.indicatorType === item.indicatorType) === idx
  );

  let riskLevel: RiskLevel = 'Low';
  if (score >= 70) {
    riskLevel = 'Critical';
  } else if (score >= 45) {
    riskLevel = 'High';
  } else if (score >= 20) {
    riskLevel = 'Medium';
  }

  const informationGaps = [
    'Demo mode evaluates text and link structure locally; it does not inspect live domain registration, SSL certificates, or sender telecom records.',
    'SignalSure cannot verify whether a referenced phone number, UPI ID, or entity actually belongs to the named organization.',
  ];

  if (dedupedEvidence.length === 0) {
    informationGaps.push(
      'No common scam phrases were detected in this short text, which does NOT confirm the message or link is genuine.'
    );
  }

  const summary =
    riskLevel === 'Critical' || riskLevel === 'High'
      ? `This submission contains ${dedupedEvidence.length} high-risk social engineering ${
          dedupedEvidence.length === 1 ? 'signal' : 'signals'
        } commonly seen in ${detectedCategory.toLowerCase()} across India. Treat it as untrusted until verified independently.`
      : riskLevel === 'Medium'
      ? 'This submission shows caution cues—such as unverified links or urgent framing—without enough context to confirm legitimacy. Verify independently before engaging.'
      : 'No overt scam keywords appeared in this short text, but absence of obvious warning signs does not prove it is safe. Always verify the sender independently.';

  const recommendedNextSteps: string[] = [];
  if (riskLevel === 'Critical' || riskLevel === 'High') {
    recommendedNextSteps.push(
      'Do not click any embedded links, download files, scan QR codes, or enter your UPI PIN or OTP.'
    );
    recommendedNextSteps.push(
      'Block the sender and report the communication inside WhatsApp/SMS or via Sanchar Saathi Chakshu.'
    );
  } else {
    recommendedNextSteps.push(
      'Avoid using phone numbers or links included inside an unexpected message to contact support.'
    );
  }
  recommendedNextSteps.push(
    'Open the organization’s official mobile app, bookmark, or published customer-care number directly to verify.'
  );
  if (riskLevel === 'Critical' || detectedCategory === 'UPI & Payment Fraud' || detectedCategory === 'KYC & Banking Impersonation') {
    recommendedNextSteps.push(
      'If you already shared an OTP, PIN, or transferred money, call 1930 immediately and freeze your card/UPI access through your bank.'
    );
  }

  const verificationGuidance =
    'Verify independently by visiting the organization’s official website directly (for example, bank.sbi, hdfcbank.com, or indiapost.gov.in) or calling the toll-free number printed on the back of your bank card.';

  return {
    mode: 'demo',
    modelLabel: 'SignalSure Demo Pattern Engine',
    analyzedAt: new Date().toISOString(),
    inputKind,
    riskLevel,
    category: detectedCategory,
    summary,
    observedEvidence: dedupedEvidence,
    informationGaps,
    recommendedNextSteps,
    verificationGuidance,
    indiaEmergencyGuidance: INDIA_EMERGENCY_GUIDANCE,
    disclaimer: DEFAULT_DISCLAIMER,
  };
}
