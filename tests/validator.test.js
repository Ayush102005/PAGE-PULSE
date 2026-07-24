/**
 * validator.test.js
 * Unit tests for the URL validation logic in utils/validator.js.
 * Covers: valid inputs, invalid inputs, SSRF protection, and the isPrivateHost helper.
 */

const { isValidUrl, isPrivateHost } = require('../utils/validator');

// ── Valid inputs ─────────────────────────────────────────────────────────────
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

  test('accepts a public IP address (8.8.8.8)', () => {
    const result = isValidUrl('http://8.8.8.8');
    expect(result.valid).toBe(true);
  });

  test('trims surrounding whitespace before validation', () => {
    const result = isValidUrl('   https://example.com   ');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('https://example.com');
  });

});

// ── Invalid / malformed inputs ────────────────────────────────────────────────
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

// ── SSRF protection ───────────────────────────────────────────────────────────
describe('isValidUrl — SSRF protection', () => {

  test('rejects requests to localhost by name', () => {
    const result = isValidUrl('http://localhost:3000/api/secret');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/private or loopback/i);
  });

  test('rejects requests to 127.0.0.1 (loopback)', () => {
    const result = isValidUrl('http://127.0.0.1/admin');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/private or loopback/i);
  });

  test('rejects requests to 10.x.x.x (RFC-1918)', () => {
    const result = isValidUrl('http://10.0.0.1/internal');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/private or loopback/i);
  });

  test('rejects requests to 192.168.x.x (RFC-1918)', () => {
    const result = isValidUrl('https://192.168.1.100/dashboard');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/private or loopback/i);
  });

  test('rejects requests to 172.16-31.x.x (RFC-1918)', () => {
    const result = isValidUrl('http://172.16.0.1');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/private or loopback/i);
  });

  test('rejects file:// scheme', () => {
    const result = isValidUrl('file:///etc/passwd');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/unsupported url scheme/i);
  });

  test('rejects javascript: scheme', () => {
    // URL constructor normalises "javascript:alert(1)" to scheme=javascript:
    const result = isValidUrl('javascript:alert(1)');
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

});

// ── isPrivateHost helper ──────────────────────────────────────────────────────
describe('isPrivateHost — helper function', () => {

  test('identifies localhost as private', () => {
    expect(isPrivateHost('localhost')).toBe(true);
  });

  test('identifies 0.0.0.0 as private', () => {
    expect(isPrivateHost('0.0.0.0')).toBe(true);
  });

  test('does NOT flag a public hostname as private', () => {
    expect(isPrivateHost('example.com')).toBe(false);
    expect(isPrivateHost('8.8.8.8')).toBe(false);
  });

});
