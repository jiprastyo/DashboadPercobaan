/**
 * scripts/tests/labor-keywords-single-source.test.ts
 * There must be exactly ONE definition of LABOR_KEYWORDS.
 * Run: npx tsx scripts/tests/labor-keywords-single-source.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { LABOR_KEYWORDS as fromConfig } from '../config';
import { LABOR_KEYWORDS as fromConstants } from '../../src/lib/constants';

// 1. The two import paths must expose the SAME array.
assert.deepEqual(
  [...fromConfig].sort(),
  [...fromConstants].sort(),
  'scripts/config.ts and src/lib/constants.ts LABOR_KEYWORDS must be identical',
);

// 2. Only one file may contain the literal definition.
const files = ['scripts/config.ts', 'src/lib/constants.ts'];
const definers = files.filter((f) =>
  /export const LABOR_KEYWORDS\s*=/.test(
    fs.readFileSync(path.join(process.cwd(), f), 'utf-8'),
  ),
);
assert.equal(definers.length, 1, `LABOR_KEYWORDS defined in ${definers.length} files: ${definers}`);

// 3. No duplicates inside the array (case-insensitive).
const lower = fromConfig.map((k) => k.toLowerCase());
assert.equal(new Set(lower).size, lower.length, 'LABOR_KEYWORDS must not contain duplicates');

console.log(`labor-keywords-single-source.test: ${fromConfig.length} keywords, single source OK`);
