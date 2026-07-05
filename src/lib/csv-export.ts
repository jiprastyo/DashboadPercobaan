'use client';

// ============================================================
// Client-side CSV export — Stage 3.1 (viz-revamp-roadmap)
// Vanilla Blob + anchor download. No export libraries: this file
// is the entire dependency (project-guardrails d: no new deps).
// ============================================================

const UTF8_BOM = '﻿';

/** Escapes a single CSV field per RFC 4180: quote if it contains a
 * comma, quote, or newline; double any embedded quotes. Numbers use
 * `.` as the decimal separator always -- CSV is data, not display;
 * locale formatting (id-ID comma-decimal) stays in the UI layer. */
function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/** Provenance for a CSV export -- surfaces the chart\'s source attribution
 * inside the file itself, not just on-screen (project-guardrails g: a number
 * without a source is a rumor, and that applies once it leaves the page
 * too). Rendered as a leading `#` comment line before the header. */
export interface CsvSource {
  label: string;
  url?: string;
}

function buildSourceCommentLine(source: CsvSource, date: Date): string {
  const stamp = csvDateStamp(date);
  const suffix = source.url ? `${source.label} \u2014 ${source.url}` : source.label;
  return `# Sumber: ${suffix}; diunduh ${stamp}`;
}

/**
 * Builds a CSV string (with UTF-8 BOM, for Excel id-ID) from an array of
 * row objects. The header row is the union of keys across all rows (so
 * rows with differing shapes still produce one consistent table), in
 * first-seen order. Pure string builder -- no DOM access -- so it is
 * directly unit-testable.
 *
 * When `source` is given, a `# Sumber: <label> \u2014 <url>; diunduh <YYYY-MM-DD>`
 * comment line is prepended after the BOM and before the header row.
 */
export function buildCsv(rows: Record<string, unknown>[], source?: CsvSource): string {
  if (rows.length === 0) {
    return source ? UTF8_BOM + buildSourceCommentLine(source, new Date()) : UTF8_BOM;
  }

  const headerOrder: string[] = [];
  const seenHeaders = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seenHeaders.has(key)) {
        seenHeaders.add(key);
        headerOrder.push(key);
      }
    }
  }

  const lines = [headerOrder.map(escapeCsvField).join(',')];
  for (const row of rows) {
    lines.push(headerOrder.map((key) => escapeCsvField(row[key])).join(','));
  }

  const body = lines.join('\r\n');

  if (source) {
    return UTF8_BOM + buildSourceCommentLine(source, new Date()) + '\r\n' + body;
  }

  return UTF8_BOM + body;
}

/**
 * Today's date as `YYYY-MM-DD`, for the `<indikator>-<page>-<YYYY-MM-DD>.csv`
 * filename convention. Client-side local date (this runs on click, not at
 * build time) -- fine here since it only affects a downloaded filename, not
 * rendered data.
 */
export function csvDateStamp(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Triggers a browser download of `rows` as a CSV file named `filename`.
 * Client-only (Blob + temporary anchor + URL.createObjectURL) -- there is
 * no server in this static-export app to do this instead.
 */
export function downloadCsv(filename: string, rows: Record<string, unknown>[], source?: CsvSource): void {
  const csvContent = buildCsv(rows, source);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
