/**
 * scripts/tests/ai-providers.test.ts
 * Every configured AI provider key must be read and turned into a provider,
 * including the comma-separated multi-key form.
 * Run: npx tsx scripts/tests/ai-providers.test.ts
 */
import assert from 'node:assert/strict';
import {
  getGeminiApiKeys,
  getGroqApiKeys,
  getMistralApiKeys,
  createMistralProviders,
  getAiProviders,
} from '../../scripts/summarizer/gemini-summarize';

const MANAGED = [
  'GEMINI_API_KEY', 'GEMINI_API_KEYS',
  'GROQ_API_KEY', 'GROQ_API_KEYS',
  'MISTRAL_API_KEY', 'MISTRAL_API_KEYS',
  'COHERE_API_KEY',
];

const saved: Record<string, string | undefined> = {};
for (const k of MANAGED) saved[k] = process.env[k];

function setEnv(v: Record<string, string | undefined>) {
  for (const k of MANAGED) delete process.env[k];
  for (const [k, val] of Object.entries(v)) {
    if (val === undefined) delete process.env[k];
    else process.env[k] = val;
  }
}

try {
  // ── Gemini (regression: already worked) ─────────────────────────────────
  setEnv({ GEMINI_API_KEY: 'g1', GEMINI_API_KEYS: 'g1,g2' });
  assert.deepEqual(getGeminiApiKeys(), ['g1', 'g2'], 'gemini single + plural, deduped');

  // ── Groq: must now read the SECOND key ──────────────────────────────────
  setEnv({ GROQ_API_KEY: 'q1', GROQ_API_KEYS: 'q1,q2' });
  assert.deepEqual(getGroqApiKeys(), ['q1', 'q2'], 'Groq must read GROQ_API_KEYS (the new 2nd key)');

  setEnv({ GROQ_API_KEYS: ' q1 , q2 ' });
  assert.deepEqual(getGroqApiKeys(), ['q1', 'q2'], 'Groq must trim whitespace');

  setEnv({});
  assert.deepEqual(getGroqApiKeys(), [], 'no Groq keys = empty array');

  // ── Mistral: brand new ──────────────────────────────────────────────────
  setEnv({ MISTRAL_API_KEY: 'm1' });
  assert.deepEqual(getMistralApiKeys(), ['m1'], 'Mistral single key');

  setEnv({ MISTRAL_API_KEYS: 'm1,m2' });
  assert.deepEqual(getMistralApiKeys(), ['m1', 'm2'], 'Mistral plural keys');

  // ── Mistral providers ───────────────────────────────────────────────────
  setEnv({});
  assert.deepEqual(createMistralProviders(), [], 'no key = no Mistral providers');

  setEnv({ MISTRAL_API_KEY: 'm1' });
  const one = createMistralProviders();
  assert.equal(one.length, 1, 'one key = one Mistral provider');
  assert.equal(one[0].name, 'mistral', 'provider name must be "mistral"');

  setEnv({ MISTRAL_API_KEY: 'm1', MISTRAL_API_KEYS: 'm1,m2' });
  assert.equal(createMistralProviders().length, 2, 'two keys = two Mistral providers');

  // ── Full chain ──────────────────────────────────────────────────────────
  setEnv({
    GEMINI_API_KEY: 'g1',
    GROQ_API_KEY: 'q1',
    GROQ_API_KEYS: 'q1,q2',
    MISTRAL_API_KEY: 'm1',
    COHERE_API_KEY: 'c1',
  });
  const chain = getAiProviders().map((p) => p.name);
  assert.ok(chain.includes('mistral'), `chain must include mistral, got: ${chain.join(' -> ')}`);
  assert.equal(chain.filter((n) => n === 'groq').length, 2, 'both Groq keys must appear in the chain');
  assert.equal(chain[0], 'gemini', 'gemini must stay first');

  setEnv({});
  assert.deepEqual(getAiProviders(), [], 'no keys at all = empty chain');
} finally {
  for (const k of MANAGED) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
}

console.log('ai-providers.test: OK');
