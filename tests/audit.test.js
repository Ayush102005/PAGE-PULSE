const { parseHtml } = require('../utils/parser');

describe('Page Pulse - HTML Parser Tests', () => {

  test('Happy Path: Correctly parses valid HTML document', () => {
    const sampleHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <meta name="description" content="Test description">
        </head>
        <body>
          <h1>Heading</h1>
          <p>Hello world string count test.</p>
          <img src="1.png" alt="valid" />
          <img src="2.png" />
        </body>
      </html>
    `;

    const result = parseHtml(sampleHtml);

    expect(result.title).toBe('Test Page');
    expect(result.metaDescription).toBe('Test description');
    expect(result.h1Count).toBe(1);
    expect(result.imagesMissingAlt).toBe(1);
    expect(result.approximateWordCount).toBe(6);
  });

  test('Failure Case 1: Handles missing tags cleanly', () => {
    const sparseHtml = '<html><body><p>Bare body text</p></body></html>';
    const result = parseHtml(sparseHtml);

    expect(result.title).toBe('N/A');
    expect(result.metaDescription).toBe('N/A');
    expect(result.h1Count).toBe(0);
    expect(result.imagesMissingAlt).toBe(0);
  });

  test('Failure Case 2: Throws error on invalid input', () => {
    expect(() => parseHtml(null)).toThrow('Invalid or empty HTML provided.');
    expect(() => parseHtml(12345)).toThrow('Invalid or empty HTML provided.');
  });

});