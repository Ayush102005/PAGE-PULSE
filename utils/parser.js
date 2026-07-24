/**
 * parser.js
 * Pure HTML parsing logic using cheerio.
 * Kept as a standalone module so it can be unit-tested without any HTTP layer.
 */

const cheerio = require('cheerio');

/**
 * Parses an HTML string and extracts SEO/audit metrics.
 *
 * @param {string} htmlContent - Raw HTML string fetched from the target URL.
 * @returns {{
 *   title: string,
 *   metaDescription: string,
 *   h1Count: number,
 *   imagesMissingAlt: number,
 *   approximateWordCount: number,
 *   canonical: string,
 *   ogTitle: string,
 *   ogDescription: string,
 *   robotsMeta: string
 * }}
 */
function parseHtml(htmlContent) {
  if (!htmlContent || typeof htmlContent !== 'string') {
    throw new Error('Invalid or empty HTML provided.');
  }

  const $ = cheerio.load(htmlContent);

  // ── Basic meta ────────────────────────────────────────────────────────────
  const title = $('title').first().text().trim() || 'N/A';
  const metaDescription = $('meta[name="description"]').attr('content')?.trim() || 'N/A';

  // ── Structural ────────────────────────────────────────────────────────────
  const h1Count = $('h1').length;

  let imagesMissingAlt = 0;
  $('img').each((_, el) => {
    const alt = $(el).attr('alt');
    // Missing alt attribute OR alt set to empty string both count as missing
    if (alt === undefined || alt.trim() === '') {
      imagesMissingAlt++;
    }
  });

  // ── Extended SEO signals ──────────────────────────────────────────────────────
  // IMPORTANT: read these BEFORE removing <head> in the word-count cleanup step
  const canonical = $('link[rel="canonical"]').attr('href')?.trim() || 'N/A';
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim() || 'N/A';
  const ogDescription = $('meta[property="og:description"]').attr('content')?.trim() || 'N/A';
  const robotsMeta = $('meta[name="robots"]').attr('content')?.trim() || 'N/A';

  // ── Word count (strip non-content nodes first) ────────────────────────────
  // Remove <head> here (after SEO reads) to exclude title/meta text from word count
  $('script, style, noscript, svg, iframe, head').remove();
  // Use <body> if present; fall back to the whole document for malformed HTML
  const rawText = ($('body').length ? $('body') : $.root()).text();
  const bodyText = rawText.replace(/\s+/g, ' ').trim();
  const approximateWordCount = bodyText
    ? bodyText.split(' ').filter(word => word.length > 0).length
    : 0;

  return {
    title,
    metaDescription,
    h1Count,
    imagesMissingAlt,
    approximateWordCount,
    canonical,
    ogTitle,
    ogDescription,
    robotsMeta,
  };
}

module.exports = { parseHtml };