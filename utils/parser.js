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

  // ── Word count (strip non-content nodes first) ────────────────────────────
  $('script, style, noscript, svg, iframe').remove();
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const approximateWordCount = bodyText
    ? bodyText.split(' ').filter(word => word.length > 0).length
    : 0;

  // ── Extended SEO signals ──────────────────────────────────────────────────
  const canonical = $('link[rel="canonical"]').attr('href')?.trim() || 'N/A';
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim() || 'N/A';
  const ogDescription = $('meta[property="og:description"]').attr('content')?.trim() || 'N/A';
  const robotsMeta = $('meta[name="robots"]').attr('content')?.trim() || 'N/A';

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