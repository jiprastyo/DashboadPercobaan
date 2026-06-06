/**
 * scripts/summarizer/gemini-summarize.ts — Gemini AI Summarizer
 * Reads latest news articles, batches them to Gemini 2.0 Flash,
 * and produces structured summaries in Bahasa Indonesia.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import fs from 'fs';
import {
  GEMINI,
  NEWS,
  log,
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
}

interface BatchResult {
  batchIndex: number;
  articles: ArticleSummary[];
  _token_usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
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

function parseGeminiResponse(responseText: string, articles: NewsArticle[]): ArticleSummary[] {
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
        sektor_terdampak: articleData.sektor_terdampak || [],
        kata_kunci: articleData.kata_kunci || [],
        _source_url: article.link || article._source_url,
        _scraped_at: timestamp(),
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log('gemini-summarize', `Error parsing Gemini response: ${msg}`);
    // Fallback: create empty summaries
    for (const article of articles) {
      summaries.push({
        title: article.title,
        link: article.link,
        outlet: article.outlet,
        ringkasan: 'Gagal memproses ringkasan',
        dampak_tenaga_kerja: 'Tidak tersedia',
        tingkat_dampak: 'tidak_diketahui',
        angka_penting: [],
        sektor_terdampak: [],
        kata_kunci: [],
        _source_url: article.link || article._source_url,
        _scraped_at: timestamp(),
      });
    }
  }

  return summaries;
}

export async function runGeminiSummarize(): Promise<{
  totalArticles: number;
  totalBatches: number;
  totalTokens: number;
}> {
  log('gemini-summarize', 'Starting Gemini AI summarizer');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    log('gemini-summarize', 'ERROR: GEMINI_API_KEY not set in environment');
    throw new Error('GEMINI_API_KEY not set');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI.model });

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
    return { totalArticles: 0, totalBatches: 0, totalTokens: 0 };
  }

  log('gemini-summarize', `Found ${articles.length} articles to summarize`);

  // Batch processing
  const allSummaries: ArticleSummary[] = [];
  const batchResults: BatchResult[] = [];
  let totalTokens = 0;
  const batchSize = GEMINI.batchSize;
  const totalBatches = Math.ceil(articles.length / batchSize);

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const start = batchIdx * batchSize;
    const end = Math.min(start + batchSize, articles.length);
    const batch = articles.slice(start, end);

    log('gemini-summarize', `Processing batch ${batchIdx + 1}/${totalBatches} (${batch.length} articles)`);

    try {
      const prompt = buildPrompt(batch);
      const result = await model.generateContent(prompt);
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

      // Add empty summaries for failed batch
      for (const article of batch) {
        allSummaries.push({
          title: article.title,
          link: article.link,
          outlet: article.outlet,
          ringkasan: `Gagal diproses: ${msg}`,
          dampak_tenaga_kerja: 'Tidak tersedia',
          tingkat_dampak: 'tidak_diketahui',
          angka_penting: [],
          sektor_terdampak: [],
          kata_kunci: [],
          _source_url: article.link || article._source_url,
          _scraped_at: timestamp(),
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
    })
    .catch((err) => {
      log('gemini-summarize', `Fatal error: ${err}`);
      process.exit(1);
    });
}
