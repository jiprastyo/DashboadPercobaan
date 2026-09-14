/**
 * scripts/tests/program-registries.test.ts
 * Guards the programme-tracker P1.4 hand-curated registries.
 *
 * Context: the three registries under data/program/ are hand-curated data files
 * (no scraper produces them). Their whole value rests on two invariants that
 * are easy to break by hand-edit and impossible to see in review:
 *
 *   1. A row is either VERIFIED (verified:true, with a real _source_url and
 *      _verified_at — the URL someone actually opened) or carries a TODO-VERIFY
 *      sentinel. Never both, never neither. Guardrail (g) applies to registry
 *      data exactly as it does to series: an unverified name/URL must never be
 *      silently promoted to verified.
 *   2. Every `available` needs-matrix row's series_ref must point at a file
 *      that physically exists in this repo. A registry pointing at a series
 *      nobody acquired is registry rot that the P2 loader would only surface
 *      as a build-time console.error.
 *
 * Run: npx tsx scripts/tests/program-registries.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PROGRAM_DIR = path.join(REPO_ROOT, 'data', 'program');

function readRegistry<T>(fileName: string): T {
  const abs = path.join(PROGRAM_DIR, fileName);
  assert.ok(fs.existsSync(abs), `${fileName} must exist at data/program/`);
  const raw = fs.readFileSync(abs, 'utf8');
  return JSON.parse(raw) as T;
}

// --- (a) all three registries parse -----------------------------------------

interface MinistryRow {
  id: string;
  name: string;
  website: string;
  verified: boolean;
  _source_url?: string;
  _verified_at?: string;
}
interface MinistriesFile {
  _updated_at: string;
  ministries: MinistryRow[];
}

interface NeedRow {
  id: string;
  ministry_id: string;
  availability: 'available' | 'partial' | 'not-collected';
  series_ref: string | null;
  _source_url?: string;
  _verified_at?: string;
}
interface NeedsFile {
  needs: NeedRow[];
}

interface ProgrammeRow {
  id: string;
  ministry_id: string;
  verified: boolean;
  target_ids: string[];
  indicator_need_ids: string[];
  _source_url?: string;
  _verified_at?: string;
}
interface ProgrammesFile {
  programmes: ProgrammeRow[];
}

const ministriesFile = readRegistry<MinistriesFile>('ministries.json');
const needsFile = readRegistry<NeedsFile>('needs-matrix.json');
const programmesFile = readRegistry<ProgrammesFile>('programmes.json');

assert.ok(Array.isArray(ministriesFile.ministries) && ministriesFile.ministries.length > 0);
assert.ok(Array.isArray(needsFile.needs) && needsFile.needs.length > 0);
assert.ok(Array.isArray(programmesFile.programmes) && programmesFile.programmes.length > 0);

// Ids must be unique within each registry (the UI keys on them).
for (const [label, rows] of [
  ['ministries', ministriesFile.ministries],
  ['needs', needsFile.needs],
  ['programmes', programmesFile.programmes],
] as const) {
  const ids = rows.map((r) => r.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(dupes, [], `${label}: duplicate ids`);
}

// --- (b) every ministry row is verified:true XOR carries a TODO sentinel -----

const SENTINEL = 'TODO-VERIFY';
const ministryIds = new Set(ministriesFile.ministries.map((m) => m.id));

for (const m of ministriesFile.ministries) {
  const serialized = JSON.stringify(m);
  const hasSentinel = serialized.includes(SENTINEL);

  assert.equal(
    typeof m.verified,
    'boolean',
    `ministry '${m.id}' must carry an explicit boolean 'verified'`,
  );

  if (m.verified) {
    assert.ok(
      !hasSentinel,
      `ministry '${m.id}' is verified:true but still carries a ${SENTINEL} sentinel — a row cannot be both`,
    );
    assert.ok(
      typeof m._source_url === 'string' && /^https?:\/\//.test(m._source_url),
      `ministry '${m.id}' is verified:true and must cite the real _source_url it was checked against`,
    );
    assert.ok(
      typeof m._verified_at === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(m._verified_at),
      `ministry '${m.id}' is verified:true and must carry _verified_at as YYYY-MM-DD`,
    );
    assert.ok(
      typeof m.website === 'string' && /^https?:\/\//.test(m.website),
      `ministry '${m.id}' is verified:true so 'website' must be a real URL, not a placeholder`,
    );
  } else {
    assert.ok(
      hasSentinel,
      `ministry '${m.id}' is verified:false and must carry a ${SENTINEL} sentinel naming what is unverified`,
    );
  }
}

// The reference row: kemnaker's scraper is live, so it is verified by definition.
const kemnaker = ministriesFile.ministries.find((m) => m.id === 'kemnaker');
assert.ok(kemnaker, 'the kemnaker reference row must exist');
assert.equal(kemnaker.verified, true, 'kemnaker is the reference row — it must stay verified:true');

// --- (c) needs-matrix: provenance + the series_ref file must exist on disk ---

for (const need of needsFile.needs) {
  assert.ok(
    ministryIds.has(need.ministry_id),
    `need '${need.id}' points at unknown ministry_id '${need.ministry_id}'`,
  );

  // Render rule (data-model.md): a row needs a real _source_url AND _verified_at.
  const serialized = JSON.stringify(need);
  assert.ok(
    !serialized.includes(SENTINEL),
    `need '${need.id}' still carries a ${SENTINEL} sentinel — sentinel rows must not ship in the matrix`,
  );
  assert.ok(
    typeof need._source_url === 'string' && /^https?:\/\//.test(need._source_url),
    `need '${need.id}' must carry a real _source_url (the probe/publication actually consulted)`,
  );
  assert.ok(
    typeof need._verified_at === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(need._verified_at),
    `need '${need.id}' must carry _verified_at as YYYY-MM-DD`,
  );

  if (need.availability === 'available') {
    assert.ok(
      typeof need.series_ref === 'string' && need.series_ref.includes('#'),
      `available need '${need.id}' must carry a series_ref of the form '<repo path>#<code>'`,
    );
  }

  if (typeof need.series_ref === 'string' && need.series_ref.length > 0) {
    const filePart = need.series_ref.split('#')[0];
    const abs = path.join(REPO_ROOT, filePart);
    assert.ok(
      fs.existsSync(abs),
      `need '${need.id}' series_ref file does not exist on disk: ${filePart}`,
    );
  }
}

// --- (d) programmes: each row carries ministry_id + a verified status --------

for (const p of programmesFile.programmes) {
  assert.ok(
    typeof p.ministry_id === 'string' && ministryIds.has(p.ministry_id),
    `programme '${p.id}' must carry a ministry_id present in ministries.json (got '${p.ministry_id}')`,
  );
  assert.equal(
    typeof p.verified,
    'boolean',
    `programme '${p.id}' must carry an explicit boolean 'verified'`,
  );
  const serialized = JSON.stringify(p);
  const hasSentinel = serialized.includes(SENTINEL);
  if (p.verified) {
    assert.ok(
      !hasSentinel,
      `programme '${p.id}' is verified:true but still carries a ${SENTINEL} sentinel`,
    );
    assert.ok(
      typeof p._source_url === 'string' && /^https?:\/\//.test(p._source_url),
      `programme '${p.id}' is verified:true and must cite the official page actually opened`,
    );
  } else {
    assert.ok(
      hasSentinel,
      `programme '${p.id}' is verified:false and must carry a ${SENTINEL} sentinel`,
    );
  }
  assert.ok(Array.isArray(p.target_ids), `programme '${p.id}' must carry a target_ids array`);
  assert.ok(
    Array.isArray(p.indicator_need_ids),
    `programme '${p.id}' must carry an indicator_need_ids array`,
  );
  // Any need id a programme claims must exist in the matrix.
  const needIds = new Set(needsFile.needs.map((n) => n.id));
  for (const needId of p.indicator_need_ids) {
    assert.ok(
      needIds.has(needId),
      `programme '${p.id}' references unknown indicator_need_id '${needId}'`,
    );
  }
}

console.log('programme registry tests passed');
