import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeWithDemoEngine, SAMPLE_CASES } from './demoAnalyzer';

test('analyzeWithDemoEngine classifies KYC suspension SMS as High or Critical and quotes exact phrases', () => {
  const kycSample = SAMPLE_CASES.find((c) => c.id === 'kyc-sms');
  assert.ok(kycSample);

  const report = analyzeWithDemoEngine(kycSample.content, kycSample.inputKind);
  assert.equal(report.mode, 'demo');
  assert.ok(report.riskLevel === 'High' || report.riskLevel === 'Critical');
  assert.ok(report.observedEvidence.length >= 2);
  assert.ok(
    report.observedEvidence.some((ev) => kycSample.content.includes(ev.quotedPhrase))
  );
  assert.ok(
    report.observedEvidence.every(
      (ev) => !/^(?:ount|tomer|ediately)\b/.test(ev.quotedPhrase)
    )
  );
  assert.ok(report.informationGaps.length >= 1);
  assert.match(report.indiaEmergencyGuidance, /1930/);
});

test('analyzeWithDemoEngine catches UPI collect PIN scam as Critical', () => {
  const upiSample = SAMPLE_CASES.find((c) => c.id === 'upi-collect');
  assert.ok(upiSample);

  const report = analyzeWithDemoEngine(upiSample.content, upiSample.inputKind);
  assert.equal(report.riskLevel, 'Critical');
  assert.equal(report.category, 'UPI & Payment Fraud');
});

test('analyzeWithDemoEngine never claims low-signal text is guaranteed safe', () => {
  const lowSample = SAMPLE_CASES.find((c) => c.id === 'low-signal-notice');
  assert.ok(lowSample);

  const report = analyzeWithDemoEngine(lowSample.content, lowSample.inputKind);
  assert.equal(report.riskLevel, 'Low');
  assert.match(report.summary, /does not prove it is safe/i);
  assert.ok(report.informationGaps.some((gap) => /does NOT confirm/i.test(gap)));
});
