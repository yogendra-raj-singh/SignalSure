export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type InputKind = 'message' | 'url';

export type ScamCategory =
  | 'UPI & Payment Fraud'
  | 'KYC & Banking Impersonation'
  | 'Fake Job & Task Scam'
  | 'Phishing & Credential Harvesting'
  | 'Delivery & Customs Scam'
  | 'Investment & Crypto Scam'
  | 'Tech Support & Remote Access'
  | 'Suspicious / Unverified Claim'
  | 'General Digital Communication';

export interface EvidenceSignal {
  indicatorType: string;
  quotedPhrase: string;
  whyItMatters: string;
  severity: 'caution' | 'high' | 'critical';
}

export interface ResearchSource {
  title: string;
  url: string;
}

export interface AnalysisReport {
  mode: 'live' | 'demo';
  modelLabel?: string;
  analyzedAt: string;
  inputKind: InputKind;
  riskLevel: RiskLevel;
  category: ScamCategory;
  summary: string;
  researchSummary?: string;
  researchQueries?: string[];
  researchSources?: ResearchSource[];
  observedEvidence: EvidenceSignal[];
  informationGaps: string[];
  recommendedNextSteps: string[];
  verificationGuidance: string;
  indiaEmergencyGuidance: string;
  disclaimer: string;
}

export interface SampleCase {
  id: string;
  title: string;
  channel: string;
  inputKind: InputKind;
  content: string;
  shortDescription: string;
}

export interface IncidentReportInput {
  scamType: string;
  channel: string;
  approximateDate: string;
  description: string;
  contactEmail?: string;
}

export interface IncidentReportReceipt {
  mode: 'live' | 'demo';
  referenceId: string;
  submittedAt: string;
  forwardedTo: string[];
  message: string;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sourceMode?: 'live' | 'demo';
  suggestedActions?: string[];
  researchSources?: ResearchSource[];
  timestamp: string;
}

export interface ServerCapabilities {
  aiAnalyzerConfigured: boolean;
  botpressConfigured: boolean;
  botpressBotId?: string;
  botpressClientId?: string;
  sheetsWebhookConfigured: boolean;
  zapierWebhookConfigured: boolean;
  gmailAlertConfigured: boolean;
  lookerStudioConfigured: boolean;
  lookerStudioUrl?: string;
}
