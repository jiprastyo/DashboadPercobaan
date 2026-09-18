/**
 * scripts/check-ai-keys.ts
 * Direct, one-call liveness check for every configured AI provider key.
 *
 * WHY: the summarizer only reveals a dead key after a whole batch has already
 * been attempted, buried in a 15-minute CI run. This asks each key one tiny
 * question and prints PASS/FAIL immediately.
 *
 * !!! SECURITY — THIS REPO IS PUBLIC !!!
 * Never print, echo, or interpolate any part of a key: no prefixes, no
 * suffixes, no lengths, no hashes. Only the env var NAME is ever shown. Any
 * output here could land in a public GitHub Actions log.
 *
 * Usage:
 *   cd ~/.hermes && set -a && . ./.env 2>/dev/null; set +a
 *   npx tsx scripts/check-ai-keys.ts
 *
 * Env vars are OPTIONAL for local runs without a shell export:
 *   GEMINI_API_KEYS, GROQ_API_KEYS, MISTRAL_API_KEY, COHERE_API_KEY
 */

import fs from 'fs';
import path from 'path';

const PROMPT = 'Reply with the single word: OK';

interface Target {
  envName: string;
  provider: string;
  model: string;
  key: string;
  url: string;
  headers: (key: string) => Record<string, string>;
  body: (model: string, prompt: string) => unknown;
  /** Pull the assistant text out of a provider-specific response body. */
  extract: (body: unknown) => string;
  /** Pull token usage out of a provider-specific response body. */
  usage?: (body: unknown) => string;
}

/** Read <NAME>_KEY and the comma-separated <NAME>_KEYS, trimmed and deduped. */
function keysFrom(singular: string, plural: string): string[] {
  const raw = [process.env[singular] ?? ''];
  for (const part of (process.env[plural] ?? '').split(',')) raw.push(part);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of raw) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

// Load .env.local if the shell did not already export the keys.
try {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const name = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[name]) process.env[name] = value;
    }
  }
} catch {
  // ignore
}

const openAiShape = {
  headers: (key: string) => ({
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }),
  body: (model: string, prompt: string) => ({
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 16,
    temperature: 0,
  }),
  extract: (body: unknown) =>
    (body as { choices?: Array<{ message?: { content?: string } }> })
      .choices?.[0]?.message?.content?.trim() ?? '',
  usage: (body: unknown) => {
    const u = (body as { usage?: { total_tokens?: number } }).usage;
    return u?.total_tokens ? `${u.total_tokens} tokens` : 'n/a';
  },
};

function buildTargets(): Target[] {
  const targets: Target[] = [];

  // Gemini: probe EVERY configured model with the first key (the candidate list
  // is where retired models hide — gemini-2.5-flash 404'd for months), and the
  // primary model with every remaining key.
  const geminiKeys = keysFrom('GEMINI_API_KEY', 'GEMINI_API_KEYS');
  const geminiModels = (process.env.GEMINI_MODELS || 'gemini-3.5-flash,gemini-3.6-flash')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);

  geminiKeys.forEach((key, keyIndex) => {
    const models = keyIndex === 0 ? geminiModels : [geminiModels[0]];
    for (const model of models) {
      targets.push({
        envName: keyIndex === 0 ? 'GEMINI_API_KEY' : `GEMINI_API_KEYS[${keyIndex}]`,
        provider: 'gemini',
        model,
        key,
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        headers: (k) => ({ 'x-goog-api-key': k, 'Content-Type': 'application/json' }),
        body: (_model, prompt) => ({ contents: [{ parts: [{ text: prompt }] }] }),
        extract: (body: unknown) => {
          const parts = (body as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          }).candidates?.[0]?.content?.parts;
          return (parts ?? []).map((p) => p.text ?? '').join('').trim();
        },
        usage: (body: unknown) => {
          const u = (body as { usageMetadata?: { totalTokenCount?: number } }).usageMetadata;
          return u?.totalTokenCount ? `${u.totalTokenCount} tokens` : 'n/a';
        },
      });
    }
  });

  keysFrom('GROQ_API_KEY', 'GROQ_API_KEYS').forEach((key, i) => {
    targets.push({
      envName: i === 0 ? 'GROQ_API_KEY' : `GROQ_API_KEYS[${i}]`,
      provider: 'groq',
      model: process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile',
      key,
      url: 'https://api.groq.com/openai/v1/chat/completions',
      ...openAiShape,
    });
  });

  keysFrom('MISTRAL_API_KEY', 'MISTRAL_API_KEYS').forEach((key, i) => {
    targets.push({
      envName: i === 0 ? 'MISTRAL_API_KEY' : `MISTRAL_API_KEYS[${i}]`,
      provider: 'mistral',
      model: process.env.MISTRAL_MODEL?.trim() || 'mistral-small-latest',
      key,
      url: 'https://api.mistral.ai/v1/chat/completions',
      ...openAiShape,
    });
  });

  for (const key of keysFrom('COHERE_API_KEY', 'COHERE_API_KEYS')) {
    targets.push({
      envName: 'COHERE_API_KEY',
      provider: 'cohere',
      model: process.env.COHERE_MODEL?.trim() || 'command-a-03-2025',
      key,
      url: 'https://api.cohere.com/v2/chat',
      headers: (k) => ({ Authorization: `Bearer ${k}`, 'Content-Type': 'application/json' }),
      body: (model, prompt) => ({
        model,
        messages: [{ role: 'user', content: prompt }],
      }),
      extract: (body: unknown) => {
        const b = body as {
          message?: { content?: Array<{ text?: string }> };
          messageText?: string;
        };
        const joined = (b.message?.content ?? []).map((p) => p.text ?? '').join('').trim();
        return joined || (b.messageText ?? '').trim();
      },
      usage: (body: unknown) => {
        const u = (body as { usage?: { tokens?: { total_tokens?: number } } }).usage;
        return u?.tokens?.total_tokens ? `${u.tokens.total_tokens} tokens` : 'n/a';
      },
    });
  }

  return targets;
}

/**
 * Remove any occurrence of the key from a string before it can be printed.
 * Defence in depth: a provider's error body could echo the key back, and this
 * repo is PUBLIC so a leaked line lands in a world-readable CI log.
 */
function scrub(text: string, key: string): string {
  if (!key) return text;
  return text.split(key).join('[redacted]');
}

async function probe(target: Target): Promise<{ ok: boolean; detail: string; ms: number }> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(target.url, {
      method: 'POST',
      headers: target.headers(target.key),
      body: JSON.stringify(target.body(target.model, PROMPT)),
      signal: controller.signal,
    });
    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
    const ms = Date.now() - startedAt;

    if (!response.ok) {
      // Surface the provider's error message only. Never echo the request,
      // which would carry the key in a header. scrub() is belt-and-braces.
      const message = parsed
        ? JSON.stringify(parsed).slice(0, 220)
        : text.slice(0, 220);
      return { ok: false, detail: `HTTP ${response.status} — ${scrub(message, target.key)}`, ms };
    }

    const content = parsed ? target.extract(parsed) : '';
    if (!content) {
      return { ok: false, detail: 'HTTP 200 but no text (check for an error body)', ms };
    }
    const usage = parsed && target.usage ? target.usage(parsed) : 'n/a';
    return { ok: true, detail: `replied ${JSON.stringify(content).slice(0, 40)} (${usage})`, ms };
  } catch (error) {
    const ms = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, detail: `request failed — ${scrub(message, target.key).slice(0, 160)}`, ms };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const targets = buildTargets();

  console.log('AI provider key check');
  console.log('='.repeat(74));
  if (targets.length === 0) {
    console.log('No keys found in the environment.');
    console.log('Export them first, e.g.:');
    console.log('  cd ~/.hermes && set -a && . ./.env && set +a');
    console.log('Then re-run: npx tsx scripts/check-ai-keys.ts');
    process.exitCode = 1;
    return;
  }

  // Sequential: parallel calls from one machine trip free-tier rate limits and
  // would make a healthy key look dead.
  let pass = 0;
  let fail = 0;

  for (const target of targets) {
    const result = await probe(target);
    const status = result.ok ? 'PASS' : 'FAIL';
    const pad = target.envName.padEnd(22);
    console.log(`${status}  ${pad} ${target.provider.padEnd(8)} ${target.model}`);
    console.log(`      ${result.detail}  [${result.ms}ms]`);
    if (result.ok) pass += 1;
    else fail += 1;
  }

  console.log('='.repeat(74));
  console.log(`${pass} passed, ${fail} failed, ${targets.length} total`);
  if (fail > 0) {
    console.log('');
    console.log('A FAIL here means the summarizer will skip that provider.');
    console.log('401/403 = bad or revoked key. 429 = free-tier cap reached.');
    console.log('404 = retired model name. 5xx = provider-side, usually transient.');
  }
  process.exitCode = fail > 0 ? 1 : 0;
}

main().catch((error) => {
  console.error('Fatal:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
