/**
 * audit.test.js
 * Unit tests for the HTML parsing logic in utils/parser.js.
 * Tests are isolated from the network — no HTTP requests are made here.
 */

const { parseHtml } = require('../utils/parser');

describe('parseHtml — happy path', () => {

  test('correctly parses a fully-formed HTML document', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <meta name="description" content="Test description">
          <link rel="canonical" href="https://example.com/page">
          <meta property="og:title" content="OG Test Title">
          <meta property="og:description" content="OG Test Desc">
          <meta name="robots" content="index, follow">
        </head>
        <body>
          <h1>Main Heading</h1>
          <p>Hello world string count test.</p>
          <img src="1.png" alt="valid image" />
          <img src="2.png" />
        </body>
      </html>
    `;

    const result = parseHtml(html);

    expect(result.title).toBe('Test Page');
    expect(result.metaDescription).toBe('Test description');
    expect(result.h1Count).toBe(1);
    expect(result.imagesMissingAlt).toBe(1);
    expect(result.approximateWordCount).toBe(7);  // "Main Heading Hello world string count test."
    expect(result.canonical).toBe('https://example.com/page');
    expect(result.ogTitle).toBe('OG Test Title');
    expect(result.ogDescription).toBe('OG Test Desc');
    expect(result.robotsMeta).toBe('index, follow');
  });

  test('counts multiple H1 tags correctly', () => {
    const html = `<html><body><h1>First</h1><h1>Second</h1><h1>Third</h1></body></html>`;
    const result = parseHtml(html);
    expect(result.h1Count).toBe(3);
  });

  test('treats empty-string alt attribute as missing alt', () => {
    // alt="" is not accessible and should count as missing
    const html = `<html><body><img src="a.png" alt=""><img src="b.png" alt="ok"></body></html>`;
    const result = parseHtml(html);
    expect(result.imagesMissingAlt).toBe(1);
  });

  test('excludes script and style content from word count', () => {
    const html = `
      <html><body>
        <p>Five words in body</p>
        <script>var x = "this should not count as words";</script>
        <style>body { color: red; }</style>
      </body></html>
    `;
    const result = parseHtml(html);
    // Only "Five words in body" — 4 words (no script/style content)
    expect(result.approximateWordCount).toBe(4);
  });

  test('returns N/A for all optional fields when tags are absent', () => {
    const html = `<html><body><p>Just some text</p></body></html>`;
    const result = parseHtml(html);

    expect(result.title).toBe('N/A');
    expect(result.metaDescription).toBe('N/A');
    expect(result.canonical).toBe('N/A');
    expect(result.ogTitle).toBe('N/A');
    expect(result.ogDescription).toBe('N/A');
    expect(result.robotsMeta).toBe('N/A');
    expect(result.h1Count).toBe(0);
    expect(result.imagesMissingAlt).toBe(0);
  });

  test('handles HTML with no <body> tag (counts words from root)', () => {
    // Malformed / fragment HTML — no wrapping <body>
    const html = '<h1>Title</h1><p>Three more words</p>';
    const result = parseHtml(html);
    // Should not throw, word count should be > 0
    expect(result.approximateWordCount).toBeGreaterThan(0);
    expect(result.h1Count).toBe(1);
  });

  test('returns zero imagesMissingAlt when there are no images', () => {
    const html = '<html><body><p>No images here at all.</p></body></html>';
    const result = parseHtml(html);
    expect(result.imagesMissingAlt).toBe(0);
  });

});

describe('parseHtml — failure cases', () => {

  test('throws on null input', () => {
    expect(() => parseHtml(null)).toThrow('Invalid or empty HTML provided.');
  });

  test('throws on non-string input', () => {
    expect(() => parseHtml(12345)).toThrow('Invalid or empty HTML provided.');
  });

  test('throws on undefined input', () => {
    expect(() => parseHtml(undefined)).toThrow('Invalid or empty HTML provided.');
  });

});