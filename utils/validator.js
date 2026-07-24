/**
 * validator.js
 * Validates and normalises raw URL strings before they hit the network layer.
 * Extracted into its own module so it can be unit-tested independently of Express.
 */

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

  // Auto-prepend https:// if no protocol is present
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);

    // Must have a valid hostname (not just a bare IP with no dot, etc.)
    if (!parsed.hostname || parsed.hostname.length < 1) {
      return { valid: false, normalized: '', error: 'URL must include a valid hostname.' };
    }

    return { valid: true, normalized: withProtocol };
  } catch {
    return { valid: false, normalized: '', error: 'Invalid URL format provided.' };
  }
}

module.exports = { isValidUrl };
