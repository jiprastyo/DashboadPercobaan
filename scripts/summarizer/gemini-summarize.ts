/**
 * AI news summarizer.
 * Uses Gemini first, then Cohere and Groq as provider fallbacks.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import fs from 'fs';
import { withOpsLog } from '../ops/ops-logger';
import {
  GEMINI,
  LABOR_KEYWORDS,
  NEWS,
  log,
  tagKBLI,
  timestamp,
  todayStr,
  writeJSON,
  readJSON,
  ensureDir,
  delay,
} from '../config';

type ProviderName = 'gemini' | 'cohere' | 'groq';

interface NewsArticle {
  title: string;
  link: string;
  date: string;
  summary: string;
  outlet: string;
  kbli_sectors: Array<{ code: string; name: string }>;
  _source_url: string;
}

interface ArticleSummary {
  title: string;
  link: string;
  outlet: string;
  ringkasan: string;
  dampak_tenaga_kerja: string;
  tingkat_dampak: 'tinggi' | 'sedang' | 'rendah' | 'tidak_diketahui';
  angka_penting: string[];
  sektor_terdampak: string[];
  kata_kunci: string[];
  _source_url: string;
  _scraped_at: string;
  _ai_provider?: ProviderName | 'fallback';
  _ai_model?: string;
}

interface BatchResult {
  batchIndex: number;
  provider: ProviderName;
  model: string;
  articles: ArticleSummary[];
  _token_usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface AiProvider {
  name: ProviderName;
  model: string;
  generate(prompt: string, batchNumber: number): Promise<{
    text: string;
    tokenUsage: BatchResult['_token_usage'];
  }>;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
}

function getGeminiApiKeys(): string[] {
  return uniqueStrings([
    process.env.GEMINI_API_KEY,
    ...(process.env.GEMINI_API_KEYS || '').split(','),
  ]);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function hasWord(phrase: string, text: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'i');
  return regex.test(text);
}

function buildFallbackTags(article: NewsArticle): Pick<ArticleSummary, 'sektor_terdampak' | 'kata_kunci'> {
  const combinedText = `${article.title || ''} ${article.summary || ''}`;
  const sektor_terdampak = uniqueStrings([
    ...(article.kbli_sectors || []).map((sector) => sector.name),
    ...tagKBLI(combinedText).map((sector) => sector.name),
  ]);
  const kata_kunci = uniqueStrings(
    LABOR_KEYWORDS.filter((keyword) => hasWord(keyword, combinedText)).slice(0, 5),
  );

  return {
    sektor_terdampak,
    kata_kunci,
  };
}

function buildFallbackSummary(article: NewsArticle, reason: string): ArticleSummary {
  const fallbackTags = buildFallbackTags(article);
  const fallbackRingkasan = article.summary?.trim() ? `Ringkasan feed: ${article.summary.trim()}` : reason;

  return {
    title: article.title,
    link: article.link,
    outlet: article.outlet,
    ringkasan: fallbackRingkasan,
    dampak_tenaga_kerja: 'Analisis AI tidak tersedia; sektor terdampak dan kata kunci diisi dari hasil scraper.',
    tingkat_dampak: 'tidak_diketahui',
    angka_penting: [],
    sektor_terdampak: fallbackTags.sektor_terdampak,
    kata_kunci: fallbackTags.kata_kunci,
    _source_url: article.link || article._source_url,
    _scraped_at: timestamp(),
    _ai_provider: 'fallback',
  };
}

function buildPrompt(articles: NewsArticle[]): string {
  const articlesText = articles
    .map(
      (a, i) =>
        `[Artikel ${i + 1}]
Judul: ${a.title}
Sumber: ${a.outlet}
Tanggal: ${a.date || 'tidak diketahui'}
Link: ${a.link}
Ringkasan awal: ${a.summary || 'tidak tersedia'}
Sektor KBLI: ${a.kbli_sectors?.map((s) => s.name).join(', ') || 'belum teridentifikasi'}`,
    )
    .join('\n\n');

  return `Anda adalah analis ketenagakerjaan Indonesia. Analisis ${articles.length} artikel berita berikut dan berikan ringkasan terstruktur untuk masing-masing artikel.

${articlesText}

Untuk SETIAP artikel, berikan analisis dalam format JSON array dengan struktur berikut:
[
  {
    "article_index": 1,
    "ringkasan": "Ringkasan singkat dalam 2-3 kalimat tentang isi artikel",
    "dampak_tenaga_kerja": "Penjelasan dampak terhadap tenaga kerja dan pasar kerja Indonesia",
    "tingkat_dampak": "tinggi/sedang/rendah/tidak_diketahui",
    "angka_penting": ["angka atau statistik penting dari artikel, contoh: '10.000 pekerja di-PHK'"],
    "sektor_terdampak": ["nama sektor yang terdampak, contoh: 'Industri Pengolahan', 'Perdagangan'"],
    "kata_kunci": ["kata kunci utama dari artikel, contoh: 'PHK', 'upah minimum', 'pengangguran'"]
  }
]

PENTING:
- Jawab HANYA dalam format JSON array yang valid
- Pastikan jumlah elemen array sama dengan jumlah artikel (${articles.length})
- Gunakan Bahasa Indonesia
- Jika informasi tidak cukup, isi dengan "tidak tersedia" atau array kosong
- tingkat_dampak hanya boleh: "tinggi", "sedang", "rendah", atau "tidak_diketahui"`;
}

function parseAiResponse(
  responseText: string,
  articles: NewsArticle[],
  provider: ProviderName,
  model: string,
): ArticleSummary[] {
  const summaries: ArticleSummary[] = [];

  try {
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonStr = arrayMatch[0];
    }

    const parsed = JSON.parse(jsonStr) as Array<{
      article_index?: number;
      ringkasan?: string;
      dampak_tenaga_kerja?: string;
      tingkat_dampak?: string;
      angka_penting?: string[];
      sektor_terdampak?: string[];
      kata_kunci?: string[];
    }>;

    for (let i = 0; i < articles.length; i++) {
      const articleData = parsed[i] || {};
      const article = articles[i];
      const fallbackTags = buildFallbackTags(article);

      const tingkat = articleData.tingkat_dampak || 'tidak_diketahui';
      const validTingkat = ['tinggi', 'sedang', 'rendah', 'tidak_diketahui'].includes(tingkat)
        ? (tingkat as ArticleSummary['tingkat_dampak'])
        : 'tidak_diketahui';

      summaries.push({
        title: article.title,
        link: article.link,
        outlet: article.outlet,
        ringkasan: articleData.ringkasan || 'Tidak tersedia',
        dampak_tenaga_kerja: articleData.dampak_tenaga_kerja || 'Tidak tersedia',
        tingkat_dampak: validTingkat,
        angka_penting: articleData.angka_penting || [],
        sektor_terdampak: articleData.sektor_terdampak?.length ? articleData.sektor_terdampak : fallbackTags.sektor_terdampak,
        kata_kunci: articleData.kata_kunci?.length ? articleData.kata_kunci : fallbackTags.kata_kunci,
        _source_url: article.link || article._source_url,
        _scraped_at: timestamp(),
        _ai_provider: provider,
        _ai_model: model,
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log('ai-summarize', `Error parsing ${provider} response: ${msg}`);
    for (const article of articles) {
      summaries.push(buildFallbackSummary(article, 'Gagal memproses ringkasan'));
    }
  }

  return summaries;
}

function createGeminiProviders(): AiProvider[] {
  // One provider per (candidate model x API key): if a model has been retired
  // by Google (as happened to gemini-2.0-flash on 2026-06-01) the failover in
  // generateContentWithProviderFailover moves to the next candidate instead of
  // silently handing every batch to Cohere/Groq.
  const apiKeys = getGeminiApiKeys();
  return GEMINI.models.flatMap((modelName) => apiKeys.map((apiKey, index) => ({
    name: 'gemini' as const,
    model: modelName,
    async generate(prompt: string, batchNumber: number) {
      const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: modelName });
      if (index > 0) {
        log('ai-summarize', `  Retrying batch ${batchNumber} with Gemini key ${index + 1} (${modelName})`);
      }
      const result = await withTimeout(
        model.generateContent(prompt),
        GEMINI.requestTimeoutMs,
        `Gemini batch ${batchNumber}`,
      );
      const usageMetadata = result.response.usageMetadata;
      return {
        text: result.response.text(),
        tokenUsage: {
          promptTokens: usageMetadata?.promptTokenCount || 0,
          completionTokens: usageMetadata?.candidatesTokenCount || 0,
          totalTokens: usageMetadata?.totalTokenCount || 0,
        },
      };
    },
  })));
}

function createCohereProvider(): AiProvider | null {
  const apiKey = process.env.COHERE_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const model = process.env.COHERE_MODEL?.trim() || 'command-a-03-2025';
  return {
    name: 'cohere',
    model,
    async generate(prompt: string, batchNumber: number) {
      const response = await withTimeout(
        fetch('https://api.cohere.com/v2/chat', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
          }),
        }),
        GEMINI.requestTimeoutMs,
        `Cohere batch ${batchNumber}`,
      );

      const body = await response.json() as {
        message?: { content?: Array<{ text?: string }> };
        usage?: {
          tokens?: { input_tokens?: number; output_tokens?: number };
          billed_units?: { input_tokens?: number; output_tokens?: number };
        };
        messageText?: string;
      };

      if (!response.ok) {
        throw new Error(`Cohere ${response.status}: ${JSON.stringify(body).slice(0, 500)}`);
      }

      const text = body.message?.content?.map((part) => part.text || '').join('').trim() || body.messageText || '';
      if (!text) {
        throw new Error('Cohere returned an empty response');
      }

      const inputTokens = body.usage?.tokens?.input_tokens || body.usage?.billed_units?.input_tokens || 0;
      const outputTokens = body.usage?.tokens?.output_tokens || body.usage?.billed_units?.output_tokens || 0;
      return {
        text,
        tokenUsage: {
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          totalTokens: inputTokens + outputTokens,
        },
      };
    },
  };
}

function createGroqProvider(): AiProvider | null {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const model = process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile';
  return {
    name: 'groq',
    model,
    async generate(prompt: string, batchNumber: number) {
      const response = await withTimeout(
        fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
          }),
        }),
        GEMINI.requestTimeoutMs,
        `Groq batch ${batchNumber}`,
      );

      const body = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };

      if (!response.ok) {
        throw new Error(`Groq ${response.status}: ${JSON.stringify(body).slice(0, 500)}`);
      }

      const text = body.choices?.[0]?.message?.content?.trim() || '';
      if (!text) {
        throw new Error('Groq returned an empty response');
      }

      return {
        text,
        tokenUsage: {
          promptTokens: body.usage?.prompt_tokens || 0,
          completionTokens: body.usage?.completion_tokens || 0,
          totalTokens: body.usage?.total_tokens || 0,
        },
      };
    },
  };
}

function getAiProviders(): AiProvider[] {
  return [
    ...createGeminiProviders(),
    createCohereProvider(),
    createGroqProvider(),
  ].filter((provider): provider is AiProvider => Boolean(provider));
}

async function generateContentWithProviderFailover(
  prompt: string,
  providers: AiProvider[],
  batchNumber: number,
) {
  let lastError: unknown;

  for (const provider of providers) {
    try {
      log('ai-summarize', `  Trying ${provider.name} (${provider.model}) for batch ${batchNumber}`);
      const result = await provider.generate(prompt, batchNumber);
      log('ai-summarize', `  ${provider.name} succeeded for batch ${batchNumber}`);
      return { ...result, provider };
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : String(error);
      log('ai-summarize', `  ${provider.name} failed for batch ${batchNumber}: ${msg}`);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function runGeminiSummarize(): Promise<{
  totalArticles: number;
  totalBatches: number;
  totalTokens: number;
  failedBatches: number;
  error?: string;
}> {
  log('ai-summarize', 'Starting AI summarizer');

  const providers = getAiProviders();
  if (providers.length === 0) {
    log('ai-summarize', 'ERROR: no AI provider API keys set in environment');
    throw new Error('No AI provider API keys set');
  }

  log('ai-summarize', `Loaded provider chain: ${providers.map((provider) => provider.name).join(' -> ')}`);

  const today = todayStr();
  const newsPath = path.join(NEWS.dataDir, `${today}.json`);

  let articles: NewsArticle[] = [];
  if (fs.existsSync(newsPath)) {
    articles = readJSON<NewsArticle[]>(newsPath) || [];
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const yesterdayPath = path.join(NEWS.dataDir, `${yesterdayStr}.json`);
    if (fs.existsSync(yesterdayPath)) {
      articles = readJSON<NewsArticle[]>(yesterdayPath) || [];
      log('ai-summarize', `Using yesterday's news (${yesterdayStr})`);
    }
  }

  if (articles.length === 0) {
    log('ai-summarize', 'No news articles found to summarize');
    return { totalArticles: 0, totalBatches: 0, totalTokens: 0, failedBatches: 0 };
  }

  log('ai-summarize', `Found ${articles.length} articles to summarize`);

  const allSummaries: ArticleSummary[] = [];
  const batchResults: BatchResult[] = [];
  let totalTokens = 0;
  let failedBatches = 0;
  const batchSize = GEMINI.batchSize;
  const totalBatches = Math.ceil(articles.length / batchSize);

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const start = batchIdx * batchSize;
    const end = Math.min(start + batchSize, articles.length);
    const batch = articles.slice(start, end);

    log('ai-summarize', `Processing batch ${batchIdx + 1}/${totalBatches} (${batch.length} articles)`);

    try {
      const prompt = buildPrompt(batch);
      const result = await generateContentWithProviderFailover(prompt, providers, batchIdx + 1);
      totalTokens += result.tokenUsage.totalTokens;

      const summaries = parseAiResponse(result.text, batch, result.provider.name, result.provider.model);
      allSummaries.push(...summaries);

      batchResults.push({
        batchIndex: batchIdx,
        provider: result.provider.name,
        model: result.provider.model,
        articles: summaries,
        _token_usage: result.tokenUsage,
      });

      log(
        'ai-summarize',
        `  Batch ${batchIdx + 1}: ${summaries.length} summaries, ${result.tokenUsage.totalTokens} tokens`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log('ai-summarize', `  Batch ${batchIdx + 1} error: ${msg}`);
      failedBatches += 1;

      for (const article of batch) {
        allSummaries.push(buildFallbackSummary(article, `Gagal diproses: ${msg}`));
      }
    }

    if (batchIdx < totalBatches - 1) {
      log('ai-summarize', `  Waiting ${GEMINI.delayMs}ms before next batch...`);
      await delay(GEMINI.delayMs);
    }
  }

  ensureDir(GEMINI.dataDir);
  const outPath = path.join(GEMINI.dataDir, `${today}.json`);
  const output = {
    date: today,
    totalArticles: allSummaries.length,
    totalBatches: batchResults.length,
    failedBatches,
    totalTokensUsed: totalTokens,
    providerChain: providers.map((provider) => ({ provider: provider.name, model: provider.model })),
    batches: batchResults,
    summaries: allSummaries,
    _source_url: newsPath,
    _scraped_at: timestamp(),
  };

writeJSON(outPath, output);
  log(
    'ai-summarize',
    `Saved ${allSummaries.length} summaries to ${outPath} (${totalTokens} total tokens)`,
  );

  // Degradation must be visible on /operasional (silent-staleness guardrail):
  // if Gemini keys are configured but zero batches were served by Gemini, the
  // primary provider is down (retired model, dead key, quota) even though the
  // fallback chain kept summaries flowing.
  const errorParts: string[] = [];
  if (failedBatches > 0) {
    errorParts.push(`${failedBatches} batch(es) failed during AI summarization`);
  }
  const geminiConfigured = providers.some((provider) => provider.name === 'gemini');
  const geminiBatches = batchResults.filter((batch) => batch.provider === 'gemini').length;
  if (geminiConfigured && batchResults.length > 0 && geminiBatches === 0) {
    errorParts.push(`Gemini unavailable; ${batchResults.length} batch(es) served by fallback provider(s)`);
  }

  return {
    totalArticles: allSummaries.length,
    totalBatches: batchResults.length,
    totalTokens,
    failedBatches,
    ...(errorParts.length > 0 ? { error: errorParts.join('; ') } : {}),
  };
}
if (require.main === module) {
  try {
    const envPath = path.join(__dirname, '..', '..', '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const value = trimmed.slice(eqIdx + 1).trim();
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      }
    }
  } catch {
    // ignore
  }

// Ops logging was lost when the provider-fallback rewrite replaced the old
  // runner (2026-06-25): the summarizer ran daily but /operasional showed it
  // dead since 06-23. withOpsLog appends to data/ops/ and updates
  // data/_metadata.json exactly like every other scraper entry point.
  withOpsLog('gemini-summarize', runGeminiSummarize)
    .then(({ logEntry }) => {
      log('ai-summarize', `Done. status=${logEntry.status} (fetched=${logEntry.items_fetched})`);
      process.exit(logEntry.status === 'error' ? 1 : 0);
    })
    .catch((err) => {
      log('ai-summarize', `Fatal error: ${err}`);
      process.exit(1);
    });
}
