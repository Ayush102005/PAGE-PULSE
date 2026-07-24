/**
 * validator.test.js
 * Unit tests for the URL validation logic in utils/validator.js.
 */

const { isValidUrl } = require('../utils/validator');

describe('isValidUrl — valid inputs', () => {

  test('accepts a URL that already has https://', () => {
    const result = isValidUrl('https://example.com');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('https://example.com');
    expect(result.error).toBeUndefined();
  });

  test('accepts a URL with http://', () => {
    const result = isValidUrl('http://example.com/path');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('http://example.com/path');
  });

  test('auto-prepends https:// when no protocol is present', () => {
    const result = isValidUrl('example.com');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('https://example.com');
  });

  test('accepts a URL with an IP address', () => {
    const result = isValidUrl('http://192.168.1.1');
    expect(result.valid).toBe(true);
  });

  test('trims surrounding whitespace before validation', () => {
    const result = isValidUrl('   https://example.com   ');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('https://example.com');
  });

});

describe('isValidUrl — invalid inputs', () => {

  test('rejects a completely random string', () => {
    const result = isValidUrl('not a url at all!!!');
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test('rejects an empty string', () => {
    const result = isValidUrl('');
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test('rejects null', () => {
    const result = isValidUrl(null);
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test('rejects a number', () => {
    const result = isValidUrl(42);
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

});
