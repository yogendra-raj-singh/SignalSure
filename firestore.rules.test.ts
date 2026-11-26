import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  BLUEPRINT_LIMITS,
  buildIncidentReportPayload,
  buildScanReportPayload,
  buildUserProfileFields,
  redactInputPreview,
} from './src/lib/firestoreSchemas';
import type { AnalysisReport } from './src/lib/types';

test('redactInputPreview masks accidental card numbers and OTP strings', () => {
  const redacted = redactInputPreview('My card is 4111 2222 3333 4444 and my OTP is 981203');
  assert.doesNotMatch(redacted, /4111/);
  assert.doesNotMatch(redacted, /981203/);
  assert.ok(redacted.length <= BLUEPRINT_LIMITS.PREVIEW_MAX);
});

test('buildScanReportPayload adheres strictly to firebase-blueprint.json bounds', () => {
  const sampleReport: AnalysisReport = {
    mode: 'live',
    analyzedAt: new Date().toISOString(),
    inputKind: 'message',
    riskLevel: 'Critical',
    category: 'KYC & Banking Impersonation',
    summary: 'Urgent KYC threat with lookalike link.',
    researchSummary: 'Official portal is bank.sbi.',
    observedEvidence: new Array(25).fill({
      indicatorType: 'Urgency',
      quotedPhrase: 'urgent',
      whyItMatters: 'pressure',
      severity: 'high',
    }),
    informationGaps: ['Gap'],
    recommendedNextSteps: ['Step'],
    verificationGuidance: 'Check official app.',
    indiaEmergencyGuidance: 'Call 1930.',
    disclaimer: 'Not proof.',
  };

  const payload = buildScanReportPayload({
    ownerId: 'user_123-abc',
    rawInput: 'A'.repeat(500),
    report: sampleReport,
    notes: 'B'.repeat(900),
  });

  assert.equal(payload.ownerId, 'user_123-abc');
  assert.equal(payload.status, 'active');
  assert.equal(payload.evidenceCount, BLUEPRINT_LIMITS.EVIDENCE_COUNT_MAX);
  assert.ok(payload.inputPreview.length <= BLUEPRINT_LIMITS.PREVIEW_MAX);
  assert.ok(payload.notes.length <= BLUEPRINT_LIMITS.NOTES_MAX);
});

test('buildUserProfileFields validates UID & email and truncates fields safely', () => {
  assert.throws(() =>
    buildUserProfileFields({ uid: 'bad$uid', email: 'user@example.com' })
  );

  const profile = buildUserProfileFields({
    uid: 'googleUid_42',
    displayName: 'Sunil',
    email: 'sunildhalter@gmail.com',
    photoURL: null,
  });
  assert.equal(profile.uid, 'googleUid_42');
  assert.equal(profile.photoUrl, '');
});

test('buildIncidentReportPayload enforces reference pattern and length limits', () => {
  const payload = buildIncidentReportPayload({
    ownerId: 'uid_99',
    referenceId: 'SS-AB12CD',
    submissionMode: 'demo',
    input: {
      scamType: 'UPI & Payment Fraud',
      channel: 'WhatsApp',
      approximateDate: '2026-11-25',
      description: 'Received an unknown UPI collect request claiming to refund marketplace deposit.',
      contactEmail: '',
    },
  });
  assert.equal(payload.status, 'submitted');
  assert.match(payload.referenceId, BLUEPRINT_LIMITS.REF_ID_PATTERN);
});

test('firestore.rules enforces catch-all deny, email_verified, terminal locks, and PII isolation', () => {
  const rulesText = fs.readFileSync('firestore.rules', 'utf8');
  assert.match(rulesText, /match \/\{document=\*\*\} \{\s*allow read, write: if false;\s*\}/);
  assert.match(rulesText, /request\.auth\.token\.email_verified == true/);
  assert.match(rulesText, /allow list: if false;/);
  assert.match(rulesText, /existing\(\)\.status != 'resolved'/);
  assert.match(rulesText, /existing\(\)\.status != 'archived'/);
  assert.match(rulesText, /isValidId\(/);
});
