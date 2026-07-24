const cheerio = require('cheerio');

function parseHtml(htmlContent) {
  if (!htmlContent || typeof htmlContent !== 'string') {
    throw new Error('Invalid or empty HTML provided.');
  }

  const $ = cheerio.load(htmlContent);

  const title = $('title').first().text().trim() || 'N/A';
  const metaDescription = $('meta[name="description"]').attr('content')?.trim() || 'N/A';
  const h1Count = $('h1').length;

  let imagesMissingAlt = 0;
  $('img').each((_, el) => {
    const alt = $(el).attr('alt');
    if (alt === undefined || alt.trim() === '') {
      imagesMissingAlt++;
    }
  });

  // Strip non-content elements to calculate clean word count
  $('script, style, noscript, svg').remove();
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const approximateWordCount = bodyText ? bodyText.split(' ').filter(word => word.length > 0).length : 0;

  return {
    title,
    metaDescription,
    h1Count,
    imagesMissingAlt,
    approximateWordCount
  };
}

module.exports = { parseHtml };