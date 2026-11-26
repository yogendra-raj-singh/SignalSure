import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildScanTelemetryStages,
  computeScanProgressPercent,
  extractInspectableHost,
  getActiveScanStageIndex,
  MINIMUM_SCAN_DURATION_MS,
} from './analysisTimeline';

test('extractInspectableHost extracts domain safely from URLs and SMS text', () => {
  assert.equal(
    extractInspectableHost('Update KYC at http://sbi-kyc-verify-portal.xyz/login now'),
    'sbi-kyc-verify-portal.xyz'
  );
  assert.equal(
    extractInspectableHost('Verify on example-customs.top/pay'),
    'example-customs.top'
  );
  assert.equal(extractInspectableHost('Plain text without any links'), null);
});

test('buildScanTelemetryStages returns 6 ordered stages spanning 15 seconds', () => {
  const stages = buildScanTelemetryStages({
    inputKind: 'message',
    engineMode: 'live',
    content: 'Customer KYC blocked at http://sbi-kyc-verify-portal.xyz/login',
  });

  assert.equal(stages.length, 6);
  assert.equal(stages[0].startMs, 0);
  assert.equal(stages[stages.length - 1].endMs, MINIMUM_SCAN_DURATION_MS);
  assert.match(stages[1].title, /sbi-kyc-verify-portal\.xyz/);
  assert.equal(stages[2].title, 'Surfing web advisories & official domains');
});

test('getActiveScanStageIndex and computeScanProgressPercent progress smoothly', () => {
  const stages = buildScanTelemetryStages({
    inputKind: 'url',
    engineMode: 'demo',
    content: 'https://parcel-fee.xyz',
  });

  assert.equal(getActiveScanStageIndex(0, stages), 0);
  assert.equal(getActiveScanStageIndex(3000, stages), 1);
  assert.equal(getActiveScanStageIndex(7000, stages), 2);
  assert.equal(getActiveScanStageIndex(14999, stages), 5);

  assert.equal(computeScanProgressPercent(0), 4);
  assert.equal(computeScanProgressPercent(7500), 50);
  assert.equal(computeScanProgressPercent(15000), 96);
});
