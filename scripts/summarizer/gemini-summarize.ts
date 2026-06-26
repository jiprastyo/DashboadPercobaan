/**
 * scripts/summarizer/gemini-summarize.ts — Gemini AI Summarizer
 * Reads latest news articles, batches them to Gemini 2.0 Flash,
 * and produces structured summaries in Bahasa Indonesia.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import fs from 'fs';
import {
  COHERE,
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
  _ai_provider?: 'gemini' | 'cohere_fallback' | 'rule_fallback';
}

interface BatchResult {
  batchIndex: number;
  provider: 'gemini' | 'cohere_fallback' | 'rule_fallback';
  articles: ArticleSummary[];
  _token_usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

function getGeminiApiKeys(): string[] {
  return uniqueStrings([
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_BACKUP,
    ...(process.env.GEMINI_API_KEYS || '').split(','),
  ]);
}

function getCohereApiKeys(): string[] {
  return uniqueStrings([
    process.env.COHERE_API_KEY,
    ...(process.env.COHERE_API_KEYS || '').split(','),
  ]);
}

function createGeminiModel(apiKey: string) {
  return new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: GEMINI.model });
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

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
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
    _ai_provider: 'rule_fallback',
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

function buildCoherePrompt(articles: NewsArticle[]): string {
  return `${buildPrompt(articles)}

Khusus untuk respons JSON object, gunakan bentuk berikut:
{
  "articles": [
    {
      "article_index": 1,
      "ringkasan": "...",
      "dampak_tenaga_kerja": "...",
      "tingkat_dampak": "tinggi/sedang/rendah/tidak_diketahui",
      "angka_penting": [],
      "sektor_terdampak": [],
      "kata_kunci": []
    }
  ]
}`;
}

function parseModelResponse(
  responseText: string,
  articles: NewsArticle[],
  provider: ArticleSummary['_ai_provider'],
): ArticleSummary[] {
  const summaries: ArticleSummary[] = [];

  try {
    // Extract JSON from response (may be wrapped in markdown code blocks)
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    // Try to find JSON array
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonStr = arrayMatch[0];
    }

    const parsed = JSON.parse(jsonStr) as
      | Array<{
          article_index?: number;
          ringkasan?: string;
          dampak_tenaga_kerja?: string;
          tingkat_dampak?: string;
          angka_penting?: string[];
          sektor_terdampak?: string[];
          kata_kunci?: string[];
        }>
      | {
          articles?: Array<{
            article_index?: number;
            ringkasan?: string;
            dampak_tenaga_kerja?: string;
            tingkat_dampak?: string;
            angka_penting?: string[];
            sektor_terdampak?: string[];
            kata_kunci?: string[];
          }>;
          summaries?: Array<{
            article_index?: number;
            ringkasan?: string;
            dampak_tenaga_kerja?: string;
            tingkat_dampak?: string;
            angka_penting?: string[];
            sektor_terdampak?: string[];
            kata_kunci?: string[];
          }>;
        };
    const parsedArticles = Array.isArray(parsed)
      ? parsed
      : parsed.articles || parsed.summaries || [];

    for (let i = 0; i < articles.length; i++) {
      const articleData = parsedArticles[i] || {};
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
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log('gemini-summarize', `Error parsing ${provider || 'model'} response: ${msg}`);
    // Fallback: preserve scraper-derived categorization when a provider returns invalid JSON.
    for (const article of articles) {
      summaries.push(buildFallbackSummary(article, 'Gagal memproses ringkasan'));
    }
  }

  return summaries;
}

function parseGeminiResponse(responseText: string, articles: NewsArticle[]): ArticleSummary[] {
  return parseModelResponse(responseText, articles, 'gemini');
}

function parseCohereResponse(responseText: string, articles: NewsArticle[]): ArticleSummary[] {
  return parseModelResponse(responseText, articles, 'cohere_fallback');
}

async function generateContentWithFailover(prompt: string, apiKeys: string[], batchNumber: number) {
  let lastError: unknown;

  for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
    const model = createGeminiModel(apiKeys[keyIndex]);

    try {
      if (keyIndex > 0) {
        log('gemini-summarize', `  Retrying batch ${batchNumber} with backup Gemini key ${keyIndex + 1}/${apiKeys.length}`);
      }

      return (await withTimeout(
        model.generateContent(prompt),
        GEMINI.requestTimeoutMs,
        `Gemini batch ${batchNumber}`,
      )) as Awaited<ReturnType<ReturnType<typeof createGeminiModel>['generateContent']>>;
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : String(error);
      log('gemini-summarize', `  Gemini key ${keyIndex + 1}/${apiKeys.length} failed for batch ${batchNumber}: ${msg}`);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function cohereTextFromResponse(value: unknown) {
  const response = value as {
    message?: {
      content?: Array<{ type?: string; text?: string }> | string;
    };
    text?: string;
  };

  if (typeof response.text === 'string') return response.text;
  if (typeof response.message?.content === 'string') return response.message.content;
  if (Array.isArray(response.message?.content)) {
    return response.message.content
      .map((part) => part.text || '')
      .filter(Boolean)
      .join('\n');
  }

  return '';
}

function cohereTokenUsageFromResponse(value: unknown) {
  const response = value as {
    usage?: {
      billed_units?: {
        input_tokens?: number;
        output_tokens?: number;
      };
      tokens?: {
        input_tokens?: number;
        output_tokens?: number;
      };
    };
  };
  const promptTokens = response.usage?.tokens?.input_tokens || response.usage?.billed_units?.input_tokens || 0;
  const completionTokens = response.usage?.tokens?.output_tokens || response.usage?.billed_units?.output_tokens || 0;

  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
}

async function generateCohereWithFailover(prompt: string, apiKeys: string[], batchNumber: number) {
  let lastError: unknown;

  for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
    try {
      if (keyIndex > 0) {
        log('gemini-summarize', `  Retrying batch ${batchNumber} with backup Cohere key ${keyIndex + 1}/${apiKeys.length}`);
      }

      const response = await withTimeout(
        fetch(COHERE.apiUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKeys[keyIndex]}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: COHERE.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            response_format: { type: 'json_object' },
          }),
        }),
        COHERE.requestTimeoutMs,
        `Cohere batch ${batchNumber}`,
      );

      const body = await response.json();
      if (!response.ok) {
        const errorBody = JSON.stringify(body).slice(0, 500);
        throw new Error(`Cohere HTTP ${response.status}: ${errorBody}`);
      }

      const text = cohereTextFromResponse(body);
      if (!text.trim()) {
        throw new Error('Cohere returned an empty response');
      }

      return { text, tokenUsage: cohereTokenUsageFromResponse(body) };
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : String(error);
      log('gemini-summarize', `  Cohere key ${keyIndex + 1}/${apiKeys.length} failed for batch ${batchNumber}: ${msg}`);
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
  log('gemini-summarize', 'Starting Gemini AI summarizer');

  const apiKeys = getGeminiApiKeys();
  const cohereApiKeys = getCohereApiKeys();

  log('gemini-summarize', `Loaded ${apiKeys.length} Gemini API key(s) and ${cohereApiKeys.length} Cohere API key(s) for failover`);

  // Load latest news articles
  const today = todayStr();
  const newsPath = path.join(NEWS.dataDir, `${today}.json`);

  // Try today, then yesterday
  let articles: NewsArticle[] = [];
  if (fs.existsSync(newsPath)) {
    articles = readJSON<NewsArticle[]>(newsPath) || [];
  } else {
    // Try yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const yesterdayPath = path.join(NEWS.dataDir, `${yesterdayStr}.json`);
    if (fs.existsSync(yesterdayPath)) {
      articles = readJSON<NewsArticle[]>(yesterdayPath) || [];
      log('gemini-summarize', `Using yesterday's news (${yesterdayStr})`);
    }
  }

  if (articles.length === 0) {
    log('gemini-summarize', 'No news articles found to summarize');
    return { totalArticles: 0, totalBatches: 0, totalTokens: 0, failedBatches: 0 };
  }

  log('gemini-summarize', `Found ${articles.length} articles to summarize`);

  // Batch processing
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

    log('gemini-summarize', `Processing batch ${batchIdx + 1}/${totalBatches} (${batch.length} articles)`);

    try {
      if (apiKeys.length === 0) {
        throw new Error('No Gemini API key set');
      }

      const prompt = buildPrompt(batch);
      const result = await generateContentWithFailover(prompt, apiKeys, batchIdx + 1);
      const response = result.response;
      const responseText = response.text();

      // Extract token usage
      const usageMetadata = response.usageMetadata;
      const tokenUsage = {
        promptTokens: usageMetadata?.promptTokenCount || 0,
        completionTokens: usageMetadata?.candidatesTokenCount || 0,
        totalTokens: usageMetadata?.totalTokenCount || 0,
      };
      totalTokens += tokenUsage.totalTokens;

      const summaries = parseGeminiResponse(responseText, batch);
      allSummaries.push(...summaries);

      batchResults.push({
        batchIndex: batchIdx,
        provider: 'gemini',
        articles: summaries,
        _token_usage: tokenUsage,
      });

      log(
        'gemini-summarize',
        `  Batch ${batchIdx + 1}: ${summaries.length} summaries, ${tokenUsage.totalTokens} tokens`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log('gemini-summarize', `  Batch ${batchIdx + 1} error: ${msg}`);

      if (cohereApiKeys.length > 0) {
        try {
          log('gemini-summarize', `  Falling back to Cohere for batch ${batchIdx + 1}`);
          const coherePrompt = buildCoherePrompt(batch);
          const cohereResult = await generateCohereWithFailover(coherePrompt, cohereApiKeys, batchIdx + 1);
          const summaries = parseCohereResponse(cohereResult.text, batch);
          allSummaries.push(...summaries);
          totalTokens += cohereResult.tokenUsage.totalTokens;

          batchResults.push({
            batchIndex: batchIdx,
            provider: 'cohere_fallback',
            articles: summaries,
            _token_usage: cohereResult.tokenUsage,
          });

          log(
            'gemini-summarize',
            `  Batch ${batchIdx + 1}: ${summaries.length} Cohere fallback summaries, ${cohereResult.tokenUsage.totalTokens} tokens`,
          );
        } catch (cohereErr: unknown) {
          const cohereMsg = cohereErr instanceof Error ? cohereErr.message : String(cohereErr);
          log('gemini-summarize', `  Cohere fallback failed for batch ${batchIdx + 1}: ${cohereMsg}`);
          failedBatches += 1;

          const summaries = batch.map((article) => buildFallbackSummary(article, `Gagal diproses: Gemini: ${msg}; Cohere: ${cohereMsg}`));
          allSummaries.push(...summaries);
          batchResults.push({
            batchIndex: batchIdx,
            provider: 'rule_fallback',
            articles: summaries,
            _token_usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          });
        }
      } else {
        failedBatches += 1;

        // Preserve scraper-derived categorization when Gemini times out, rate-limits, or has no configured key.
        const summaries = batch.map((article) => buildFallbackSummary(article, `Gagal diproses: ${msg}`));
        allSummaries.push(...summaries);
        batchResults.push({
          batchIndex: batchIdx,
          provider: 'rule_fallback',
          articles: summaries,
          _token_usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        });
      }
    }

    // Delay between batches
    if (batchIdx < totalBatches - 1) {
      log('gemini-summarize', `  Waiting ${GEMINI.delayMs}ms before next batch...`);
      await delay(GEMINI.delayMs);
    }
  }

  // Save summaries
  ensureDir(GEMINI.dataDir);
  const outPath = path.join(GEMINI.dataDir, `${today}.json`);
  const output = {
    date: today,
    totalArticles: allSummaries.length,
    totalBatches: batchResults.length,
    failedBatches,
    totalTokensUsed: totalTokens,
    batches: batchResults,
    summaries: allSummaries,
    _source_url: newsPath,
    _scraped_at: timestamp(),
  };

  writeJSON(outPath, output);
  log(
    'gemini-summarize',
    `Saved ${allSummaries.length} summaries to ${outPath} (${totalTokens} total tokens)`,
  );

  return {
    totalArticles: allSummaries.length,
    totalBatches: batchResults.length,
    totalTokens,
    failedBatches,
    ...(failedBatches > 0 ? { error: `${failedBatches} batch(es) failed during Gemini summarization` } : {}),
  };
}

// Run directly
if (require.main === module) {
  // Load .env.local if exists
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

  runGeminiSummarize()
    .then((result) => {
      log('gemini-summarize', `Done. ${JSON.stringify(result)}`);
      process.exit(0);
    })
    .catch((err) => {
      log('gemini-summarize', `Fatal error: ${err}`);
      process.exit(1);
    });
}
