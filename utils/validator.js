/**
 * validator.js
 * Validates and normalises raw URL strings before they hit the network layer.
 * Extracted into its own module so it can be unit-tested independently of Express.
 *
 * Security: Also enforces SSRF protection by rejecting requests to loopback
 * addresses, private RFC-1918 ranges, and non-HTTP(S) schemes.
 */

// Private / reserved IPv4 ranges that must never be fetched
const PRIVATE_IP_PATTERNS = [
  /^127\./,                       // 127.0.0.0/8   loopback
  /^10\./,                        // 10.0.0.0/8    RFC-1918
  /^192\.168\./,                  // 192.168.0.0/16 RFC-1918
  /^172\.(1[6-9]|2\d|3[01])\./,  // 172.16-31.x    RFC-1918
  /^169\.254\./,                  // 169.254.0.0/16 link-local
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,  // 100.64-127.x shared address
  /^::1$/,                        // IPv6 loopback
  /^fc/i,                         // IPv6 unique local fc::/7
  /^fd/i,                         // IPv6 unique local fd::/7
  /^fe80/i,                       // IPv6 link-local
];

/**
 * Returns true if the hostname looks like a private/loopback address.
 * @param {string} hostname
 * @returns {boolean}
 */
function isPrivateHost(hostname) {
  const h = hostname.toLowerCase();
  // Explicit loopback names
  if (h === 'localhost' || h === '0.0.0.0' || h === '::1') return true;
  // Strip brackets from IPv6 literals, e.g. [::1]
  const bare = h.replace(/^\[/, '').replace(/]$/, '');
  return PRIVATE_IP_PATTERNS.some((re) => re.test(bare));
}

/**
 * Validates a raw URL string and returns a normalised version.
 *
 * @param {string} rawUrl - The URL string submitted by the client.
 * @returns {{ valid: boolean, normalized: string, error?: string }}
 */
function isValidUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, normalized: '', error: 'URL must be a non-empty string.' };
  }

  const trimmed = rawUrl.trim();

  if (trimmed.length === 0) {
    return { valid: false, normalized: '', error: 'URL cannot be blank.' };
  }

  // Early scheme check — if the input already has a scheme that isn't http(s),
  // reject it immediately before we have a chance to mangle it with auto-prepend.
  // e.g. "file:///etc/passwd", "javascript:alert(1)", "data:text/html,..."
  if (/^[a-z][a-z0-9+\-.]*:/i.test(trimmed) && !/^https?:/i.test(trimmed)) {
    const schemePart = trimmed.split(':')[0];
    return { valid: false, normalized: '', error: `Unsupported URL scheme "${schemePart}". Only http and https are allowed.` };
  }

  // Auto-prepend https:// if no protocol is present
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);

    // Only allow http and https schemes — block file://, javascript://, etc.
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, normalized: '', error: `Unsupported URL scheme "${parsed.protocol.replace(':', '')}". Only http and https are allowed.` };
    }

    // Must have a valid hostname
    if (!parsed.hostname || parsed.hostname.length < 1) {
      return { valid: false, normalized: '', error: 'URL must include a valid hostname.' };
    }

    // SSRF guard — reject requests to private/internal network addresses
    if (isPrivateHost(parsed.hostname)) {
      return { valid: false, normalized: '', error: 'Requests to private or loopback addresses are not allowed.' };
    }

    return { valid: true, normalized: withProtocol };
  } catch {
    return { valid: false, normalized: '', error: 'Invalid URL format provided.' };
  }
}

module.exports = { isValidUrl, isPrivateHost };
