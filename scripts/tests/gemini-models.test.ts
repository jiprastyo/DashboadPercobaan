/**
 * scripts/tests/gemini-models.test.ts
 * The candidate model list must not contain retired models.
 * gemini-2.5-flash returns 404 "no longer available to new users"
 * (confirmed in the 2026-09-18 CI log).
 * Run: npx tsx scripts/tests/gemini-models.test.ts
 */
import assert from 'node:assert/strict';
import { GEMINI } from '../config';

const RETIRED = ['gemini-2.0-flash', 'gemini-2.5-flash'];

for (const dead of RETIRED) {
  assert.ok(
    !GEMINI.models.includes(dead),
    `GEMINI.models must not contain retired model "${dead}"`,
  );
}

assert.ok(GEMINI.models.length >= 2, 'need at least 2 candidate models for failover');
assert.ok(
  GEMINI.models.includes('gemini-3.6-flash'),
  "GEMINI.models must include gemini-3.6-flash (Google's stated replacement)",
);

console.log(`gemini-models.test: OK (${GEMINI.models.join(', ')})`);
