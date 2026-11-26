import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAnalysisLogPayload,
  buildOrganizedSheetRow,
  escapeSheetCellValue,
  extractSpreadsheetId,
  redactFullInputForSheet,
  SHEET_HEADERS,
} from './googleSheets';
import type { AnalysisReport } from './types';

const SAMPLE_REPORT: AnalysisReport = {
  mode: 'live',
  modelLabel: 'Gemini AI',
  analyzedAt: '2026-11-25T10:15:00.000Z',
  inputKind: 'message',
  riskLevel: 'High',
  category: 'KYC & Banking Impersonation',
  summary:
    'This message uses urgent account-freeze framing paired with an unverified short link.',
  observedEvidence: [
    {
      indicatorType: 'Urgency & Account Threat',
      quotedPhrase: 'KYC blocked in 2 hours',
      whyItMatters: 'Pressures quick action without verification.',
      severity: 'high',
    },
  ],
  informationGaps: ['Sender header cannot be verified from pasted text.'],
  recommendedNextSteps: [
    'Do not click the embedded link.',
    'Check account status inside your official bank mobile app.',
  ],
  verificationGuidance:
    'Open your official bank portal directly instead of message links.',
  indiaEmergencyGuidance: 'Call 1930 or report on https://cybercrime.gov.in.',
  disclaimer: 'AI-assisted assessment only.',
  researchSources: [
    {
      title: 'RBI Sachet Advisory',
      url: 'https://sachet.rbi.org.in/',
    },
  ],
};

test('extractSpreadsheetId parses full Google Sheets URLs and raw IDs', () => {
  assert.equal(
    extractSpreadsheetId(
      'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0'
    ),
    '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
  );
  assert.equal(
    extractSpreadsheetId('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'),
    '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
  );
  assert.equal(extractSpreadsheetId('short'), null);
  assert.equal(extractSpreadsheetId('https://example.com/not-sheets'), null);
});

test('redactFullInputForSheet scrubs card digits and OTP/PIN values and blocks formula injection', () => {
  const scrubbed = redactFullInputForSheet(
    '=CMD("calc") Card 4111 2222 3333 4444 and my otp is 987654'
  );
  assert.equal(scrubbed.startsWith("'="), true);
  assert.equal(scrubbed.includes('4111'), false);
  assert.equal(scrubbed.includes('[REDACTED-CARD]'), true);
  assert.equal(scrubbed.includes('987654'), false);
  assert.equal(scrubbed.includes('[REDACTED]'), true);
});

test('escapeSheetCellValue neutralizes leading formula characters', () => {
  assert.equal(escapeSheetCellValue('=SUM(A1:A2)'), "'=SUM(A1:A2)");
  assert.equal(escapeSheetCellValue('+12345'), "'+12345");
  assert.equal(escapeSheetCellValue('Safe text'), 'Safe text');
});

test('buildOrganizedSheetRow produces columns aligned 1:1 with SHEET_HEADERS', () => {
  const row = buildOrganizedSheetRow({
    rawInput: 'Urgent: Your KYC blocked in 2 hours, verify now.',
    userEmail: 'sunildhalter@gmail.com',
    report: SAMPLE_REPORT,
  });

  assert.equal(row.length, SHEET_HEADERS.length);
  assert.equal(row[0], '2026-11-25T10:15:00.000Z');
  assert.equal(row[1], 'sunildhalter@gmail.com');
  assert.equal(row[2], 'Live AI + Web Research');
  assert.equal(row[3], 'MESSAGE');
  assert.match(row[4], /KYC blocked in 2 hours/);
  assert.equal(row[5], 'High');
  assert.equal(row[6], 'KYC & Banking Impersonation');
  assert.equal(
    row[7],
    'This message uses urgent account-freeze framing paired with an unverified short link.'
  );
  assert.match(row[8], /\[HIGH\] Urgency & Account Threat/);
  assert.match(row[9], /1\. Do not click/);
  assert.match(row[11], /https:\/\/sachet\.rbi\.org\.in\//);
});

test('buildAnalysisLogPayload includes headers, organized row, email, and response message', () => {
  const payload = buildAnalysisLogPayload({
    rawInput: 'https://verify-kyc-fake.xyz',
    userEmail: null,
    report: { ...SAMPLE_REPORT, inputKind: 'url', mode: 'demo' },
  });

  assert.equal(payload.eventType, 'analysis_result');
  assert.equal(payload.userEmail, 'Not signed in');
  assert.equal(payload.inputKind, 'url');
  assert.equal(payload.headers.length, SHEET_HEADERS.length);
  assert.equal(payload.row.length, SHEET_HEADERS.length);
  assert.equal(payload.responseMessage, SAMPLE_REPORT.summary);
});
