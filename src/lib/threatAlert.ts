import { redactFullInputForSheet } from './googleSheets';
import type { AnalysisReport, RiskLevel } from './types';

export interface ThreatAlertEmailPayload {
  eventType: 'threat_alert';
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  riskLevel: 'High' | 'Critical';
  category: string;
  analyzedAt: string;
  inputPreview: string;
  summary: string;
  recommendedNextSteps: string[];
  verificationGuidance: string;
  indiaEmergencyGuidance: string;
  emailBody: string;
}

export function isThreatAlertEligible(riskLevel: RiskLevel): riskLevel is 'High' | 'Critical' {
  return riskLevel === 'High' || riskLevel === 'Critical';
}

export function buildThreatAlertEmailPayload(params: {
  recipientEmail: string;
  recipientName?: string | null;
  rawInput: string;
  report: AnalysisReport;
}): ThreatAlertEmailPayload {
  const email = params.recipientEmail.trim().slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('A valid verified recipient email address is required.');
  }

  if (!isThreatAlertEligible(params.report.riskLevel)) {
    throw new Error('Threat alert emails are only generated for High or Critical findings.');
  }

  const cleanName = (params.recipientName || '').trim().slice(0, 120);
  const inputPreview = redactFullInputForSheet(params.rawInput, 260);
  const subject = `SignalSure ${params.report.riskLevel} Risk Alert: ${params.report.category}`;
  const steps = params.report.recommendedNextSteps.slice(0, 5);
  const stepsFormatted =
    steps.length > 0
      ? steps.map((step, i) => `${i + 1}. ${step}`).join('\n')
      : '1. Do not click any link, scan QR codes, or share OTPs/UPI PINs.';

  const greeting = cleanName ? `Hello ${cleanName},` : 'Hello,';
  const emailBody = [
    greeting,
    '',
    `SignalSure flagged a ${params.report.riskLevel.toUpperCase()} RISK submission (${params.report.category}).`,
    '',
    'Assessment Summary:',
    params.report.summary,
    '',
    'Redacted Submission Excerpt:',
    `"${inputPreview}"`,
    '',
    'Recommended Next Steps:',
    stepsFormatted,
    '',
    'Independent Verification:',
    params.report.verificationGuidance,
    '',
    'India Emergency Cyber Help:',
    params.report.indiaEmergencyGuidance,
    '',
    '---',
    'Note: SignalSure provides AI-assisted risk indicators, not proof that a message is fraudulent or safe.',
  ].join('\n');

  return {
    eventType: 'threat_alert',
    recipientEmail: email,
    recipientName: cleanName || undefined,
    subject,
    riskLevel: params.report.riskLevel,
    category: params.report.category,
    analyzedAt: params.report.analyzedAt,
    inputPreview,
    summary: params.report.summary,
    recommendedNextSteps: steps,
    verificationGuidance: params.report.verificationGuidance,
    indiaEmergencyGuidance: params.report.indiaEmergencyGuidance,
    emailBody,
  };
}
