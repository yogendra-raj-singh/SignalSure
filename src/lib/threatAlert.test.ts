import test from 'node:test';
import assert from 'node:assert/strict';
import { buildThreatAlertEmailPayload, isThreatAlertEligible } from './threatAlert';
import type { AnalysisReport } from './types';

const BASE_REPORT: AnalysisReport = {
  mode: 'live',
  analyzedAt: '2026-11-25T10:30:00.000Z',
  inputKind: 'message',
  riskLevel: 'Critical',
  category: 'UPI & Payment Fraud',
  summary: 'Requests UPI PIN approval under false refund framing.',
  observedEvidence: [],
  informationGaps: [],
  recommendedNextSteps: [
    'Decline the UPI collect request immediately.',
    'Do not enter your UPI PIN to receive money.',
  ],
  verificationGuidance: 'Verify directly inside your official bank app.',
  indiaEmergencyGuidance: 'Call 1930 or report on https://cybercrime.gov.in.',
  disclaimer: 'AI-assisted assessment only.',
};

test('isThreatAlertEligible only enables High and Critical risk levels', () => {
  assert.equal(isThreatAlertEligible('Low'), false);
  assert.equal(isThreatAlertEligible('Medium'), false);
  assert.equal(isThreatAlertEligible('High'), true);
  assert.equal(isThreatAlertEligible('Critical'), true);
});

test('buildThreatAlertEmailPayload formats subject, redacts secrets, and rejects low risk', () => {
  assert.throws(() =>
    buildThreatAlertEmailPayload({
      recipientEmail: 'sunildhalter@gmail.com',
      rawInput: 'Low risk text',
      report: { ...BASE_REPORT, riskLevel: 'Low' },
    })
  );

  const payload = buildThreatAlertEmailPayload({
    recipientEmail: 'sunildhalter@gmail.com',
    recipientName: 'Sunil',
    rawInput: 'Approve UPI request, my pin is 4321 and card 4111 2222 3333 4444',
    report: BASE_REPORT,
  });

  assert.equal(payload.eventType, 'threat_alert');
  assert.equal(payload.recipientEmail, 'sunildhalter@gmail.com');
  assert.equal(payload.subject, 'SignalSure Critical Risk Alert: UPI & Payment Fraud');
  assert.equal(payload.inputPreview.includes('4321'), false);
  assert.equal(payload.inputPreview.includes('4111'), false);
  assert.match(payload.emailBody, /Hello Sunil,/);
  assert.match(payload.emailBody, /1930/);
  assert.match(payload.emailBody, /Decline the UPI collect request/);
});
