import assert from 'node:assert/strict';
import {
  extractPublicationDayFromUrl,
  isPlausibleNewsPublicationDate,
  isRealPublisherUrl,
  normalizeNewsTitle,
} from '../../src/lib/news-quality';

assert.equal(isRealPublisherUrl('https://news.google.com/rss/articles/example'), false);
assert.equal(isRealPublisherUrl('https://example.com/news/article'), true);
assert.equal(
  extractPublicationDayFromUrl('https://riaupos.jawapos.com/riau/1110110020/example'),
  '2011-10-11',
);
assert.equal(
  extractPublicationDayFromUrl('https://example.com/2026/06/25/article'),
  '2026-06-25',
);
assert.equal(
  extractPublicationDayFromUrl('https://www.cnnindonesia.com/ekonomi/20260624171430-95-1/article'),
  '2026-06-24',
);
assert.equal(
  isPlausibleNewsPublicationDate(
    '2026-06-25T04:00:00.000Z',
    'https://example.com/2026/06/25/article',
    Date.parse('2026-06-26T00:00:00.000Z'),
  ),
  true,
);
assert.equal(
  isPlausibleNewsPublicationDate(
    '2010-02-04T08:00:00.000Z',
    'https://example.com/article',
    Date.parse('2026-06-26T00:00:00.000Z'),
  ),
  false,
);
assert.equal(
  isPlausibleNewsPublicationDate(
    '2026-06-25T04:00:00.000Z',
    'https://example.com/2026/06/24/article',
    Date.parse('2026-06-26T00:00:00.000Z'),
  ),
  false,
);
assert.equal(
  normalizeNewsTitle('PHK Buruh Besar-besaran - Contoh Media'),
  'phk buruh besar besaran',
);

console.log('news quality tests passed');
