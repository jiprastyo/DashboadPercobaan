/**
 * scripts/scrapers/gemini-summarize.ts
 * Uses Google Gemini API to analyze raw news articles and PHK data.
 * It reads from data/news and data/kemenaker, and outputs AI-summarized metadata:
 * - province_code (00 for National, 11-98 for specific provinces)
 * - trend (naik / turun / stabil)
 * - concise summary
 */

import { GoogleGenerativeAI, Schema, SchemaType } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { log, writeJSON, DATA_DIR } from '../config';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Using a structured JSON schema for Gemini to ensure reliable parsing
const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    province_code: {
      type: SchemaType.STRING,
      description: "2-digit BPS code of the province mentioned (e.g. '31' for Jakarta, '32' for Jawa Barat). Use '00' if National or unspecific.",
    },
    trend: {
      type: SchemaType.STRING,
      description: "Determine the sector trend indicated by the article. Return 'naik', 'turun', or 'stabil'.",
    },
    summary: {
      type: SchemaType.STRING,
      description: "A very concise 1-2 sentence summary of the labor-related event.",
    }
  },
  required: ["province_code", "trend", "summary"]
};

export async function runGeminiSummarizer() {
  if (!GEMINI_API_KEY) {
    log('gemini', 'WARNING: GEMINI_API_KEY is not set. Skipping AI summarization.');
    return;
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  // Use gemini-1.5-flash as it is fast and supports JSON schema natively
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.2,
    }
  });

  log('gemini', 'Starting Gemini Summarizer for unprocessed articles...');

  const directoriesToProcess = [
    path.join(DATA_DIR, 'news'),
    path.join(DATA_DIR, 'kemenaker', 'phk')
  ];

  let totalProcessed = 0;

  for (const dir of directoriesToProcess) {
    if (!fs.existsSync(dir)) continue;

    // We look for any JSON files containing arrays of articles
    // For simplicity, we just recursively find JSON files
    const processDir = async (currentPath: string) => {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        if (entry.isDirectory()) {
          await processDir(fullPath);
        } else if (entry.isFile() && fullPath.endsWith('.json')) {
          await processFile(fullPath);
        }
      }
    };

    const processFile = async (filePath: string) => {
      const rawData = fs.readFileSync(filePath, 'utf-8');
      try {
        const articles = JSON.parse(rawData);
        if (!Array.isArray(articles)) return;

        let updated = false;
        
        for (const article of articles) {
          // Skip if already summarized by AI
          if (article.ai_summary) continue;
          
          log('gemini', `Analyzing: ${article.title.substring(0, 50)}...`);
          const prompt = `
          Analyze the following news article about the Indonesian Labor Market:
          Title: ${article.title}
          Content: ${article.summary || article.body || ''}
          
          Identify:
          1. The specific Indonesian province affected (use its 2-digit BPS code, e.g., 31 for DKI Jakarta, 32 for Jawa Barat, 33 for Jawa Tengah, 35 for Jawa Timur. If it's a national policy or doesn't mention a specific province, output '00').
          2. The trend of the industry/sector mentioned ('naik' for growth/hiring/expansion, 'turun' for layoffs/PHK/bankruptcy, 'stabil' for neutral).
          3. A 1-2 sentence concise summary.
          `;

          try {
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            const aiData = JSON.parse(responseText);

            article.province_code = aiData.province_code;
            article.trend = aiData.trend;
            article.ai_summary = aiData.summary;
            updated = true;
            totalProcessed++;

            // Rate limiting delay for Gemini API (free tier limits)
            await new Promise(r => setTimeout(r, 4000));
          } catch (e) {
            log('gemini', `Failed to analyze article: ${article.title}`);
          }
        }

        if (updated) {
          writeJSON(filePath, articles);
          log('gemini', `Updated ${filePath} with AI metadata.`);
        }

      } catch (e) {
        // Not a JSON array or parsing error
      }
    };

    await processDir(dir);
  }

  log('gemini', `Done. Processed ${totalProcessed} new articles.`);
}

if (require.main === module) {
  runGeminiSummarizer().catch(console.error);
}
