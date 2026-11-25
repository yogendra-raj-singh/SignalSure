import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectSensitiveDataWarning,
  extractGroundingSources,
  sanitizeExternalUrl,
  validateAnalysisInput,
  validateAnalysisReport,
  validateIncidentInput,
} from './validation';

test('validateAnalysisInput rejects empty and oversized inputs', () => {
  const emptyMsg = validateAnalysisInput('   ', 'message');
  assert.equal(emptyMsg.valid, false);
  assert.ok(emptyMsg.error);

  const shortMsg = validateAnalysisInput('hi there', 'message');
  assert.equal(shortMsg.valid, false);

  const longMsg = validateAnalysisInput('a'.repeat(4001), 'message');
  assert.equal(longMsg.valid, false);
});

test('validateAnalysisInput validates URL inputs accurately', () => {
  const validUrl = validateAnalysisInput('https://example-verify.xyz/kyc', 'url');
  assert.equal(validUrl.valid, true);

  const domainOnly = validateAnalysisInput('example-verify.xyz/login', 'url');
  assert.equal(domainOnly.valid, true);

  const invalidWithSpace = validateAnalysisInput('not a url', 'url');
  assert.equal(invalidWithSpace.valid, false);

  const badScheme = validateAnalysisInput('javascript:alert(1)', 'url');
  assert.equal(badScheme.valid, false);
});

test('detectSensitiveDataWarning flags card numbers and explicit secret sharing', () => {
  assert.ok(detectSensitiveDataWarning('My card number is 4111 2222 3333 4444'));
  assert.ok(detectSensitiveDataWarning('My OTP is 492811 please check'));
  assert.equal(
    detectSensitiveDataWarning('Bank SMS says click link to update KYC today'),
    undefined
  );
});

test('validateAnalysisReport normalizes schema and preserves AI disclaimer', () => {
  const report = validateAnalysisReport(
    {
      riskLevel: 'High',
      category: 'KYC & Banking Impersonation',
      summary: 'Suspicious KYC deadline language.',
      observedEvidence: [
        {
          indicatorType: 'Urgency',
          quotedPhrase: 'blocked within 2 hours',
          whyItMatters: 'Pressures quick action.',
          severity: 'high',
        },
      ],
      informationGaps: ['Cannot verify sender header.'],
      recommendedNextSteps: ['Verify inside bank app.'],
      verificationGuidance: 'Use official bank app.',
    },
    'live',
    'message'
  );

  assert.equal(report.mode, 'live');
  assert.equal(report.riskLevel, 'High');
  assert.equal(report.observedEvidence.length, 1);
  assert.match(report.disclaimer, /not proof/i);
  assert.match(report.indiaEmergencyGuidance, /1930/);
});

test('validateIncidentInput enforces required fields and blocks sensitive credentials', () => {
  const missing = validateIncidentInput({
    scamType: '',
    channel: '',
    approximateDate: '',
    description: 'short',
    contactEmail: 'bad-email',
  });
  assert.equal(missing.valid, false);
  assert.ok(missing.errors.scamType);
  assert.ok(missing.errors.channel);
  assert.ok(missing.errors.approximateDate);
  assert.ok(missing.errors.description);
  assert.ok(missing.errors.contactEmail);

  const valid = validateIncidentInput({
    scamType: 'UPI & Payment Fraud',
    channel: 'WhatsApp',
    approximateDate: '2026-11-20',
    description: 'Received a fake marketplace buyer message requesting a UPI collect approval.',
    contactEmail: 'citizen@example.in',
  });
  assert.equal(valid.valid, true);
});

test('sanitizeExternalUrl only allows public https links', () => {
  assert.equal(sanitizeExternalUrl('https://cybercrime.gov.in/'), 'https://cybercrime.gov.in/');
  assert.equal(sanitizeExternalUrl('javascript:alert(1)'), null);
  assert.equal(sanitizeExternalUrl('http://example.com'), null);
  assert.equal(sanitizeExternalUrl('https://localhost:3000/test'), null);
  assert.equal(sanitizeExternalUrl('https://127.0.0.1/test'), null);
});

test('extractGroundingSources sanitizes URLs, deduplicates, and normalizes search queries', () => {
  const result = extractGroundingSources({
    webSearchQueries: ['  SBI official website India ', 'SBI official website India', '', 'RBI KYC fraud advisory'],
    groundingChunks: [
      { web: { uri: 'https://sbi.co.in/', title: 'State Bank of India' } },
      { web: { uri: 'https://sbi.co.in/', title: 'Duplicate SBI' } },
      { web: { uri: 'javascript:alert(1)', title: 'Bad Link' } },
      { web: { uri: 'http://insecure.example.com', title: 'Insecure' } },
      { web: { uri: 'https://cybercrime.gov.in/' } },
    ],
  });

  assert.deepEqual(result.researchQueries, [
    'SBI official website India',
    'RBI KYC fraud advisory',
  ]);
  assert.equal(result.researchSources.length, 2);
  assert.deepEqual(result.researchSources[0], {
    title: 'State Bank of India',
    url: 'https://sbi.co.in/',
  });
  assert.deepEqual(result.researchSources[1], {
    title: 'cybercrime.gov.in',
    url: 'https://cybercrime.gov.in/',
  });
});

test('validateAnalysisReport preserves sanitized researchSummary, queries, and sources', () => {
  const report = validateAnalysisReport(
    {
      riskLevel: 'Critical',
      category: 'KYC & Banking Impersonation',
      summary: 'Matches fake KYC suspension scam.',
      researchSummary: 'Official SBI portal is sbi.co.in, not external .xyz KYC links.',
      researchQueries: ['SBI official KYC portal', ''],
      researchSources: [
        { title: 'SBI Official', url: 'https://sbi.co.in/' },
        { title: 'Malicious', url: 'javascript:void(0)' },
      ],
      observedEvidence: [],
    },
    'live',
    'message'
  );

  assert.equal(
    report.researchSummary,
    'Official SBI portal is sbi.co.in, not external .xyz KYC links.'
  );
  assert.deepEqual(report.researchQueries, ['SBI official KYC portal']);
  assert.deepEqual(report.researchSources, [
    { title: 'SBI Official', url: 'https://sbi.co.in/' },
  ]);
});
