/**
 * server.js
 * Express application for Page Pulse — an instant webpage audit API.
 *
 * Design decisions:
 *  1. `app` is exported separately from `listen()` so tests can import the
 *     app without binding a port (avoids port-conflict errors in test suites).
 *  2. URL validation is delegated to `utils/validator.js` (single responsibility).
 *     It also enforces SSRF protection by blocking private/loopback addresses.
 *  3. HTTP 408 is used for timeout (RFC-7231 §6.5.7) rather than a custom 5xx code,
 *     which makes it easier for API consumers to handle without special-casing.
 *  4. `runAudit()` is extracted as a shared helper so both POST /api/audit (JSON body)
 *     and GET /api/audit?url= (query param) use the exact same logic with no duplication.
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const { parseHtml } = require('./utils/parser');
const { isValidUrl } = require('./utils/validator');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Content Security Policy — allows self-hosted assets and Vercel live previews
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://vercel.live; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; connect-src 'self' https://vercel.live;"
  );
  next();
});

// Simple request logger
app.use((req, res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.path}`);
  next();
});

// ── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Audit endpoint ──────────────────────────────────────────────────────────
/**
 * Shared audit logic — accepts a raw URL string, fetches the page,
 * and returns a JSON report or an Express error response.
 * Extracted so both the POST and GET variants can call the same code.
 */
async function runAudit(rawUrl, res) {
  if (!rawUrl) {
    return res.status(400).json({ error: 'URL is required.' });
  }

  // Validate and normalise the URL
  const { valid, normalized, error: validationError } = isValidUrl(rawUrl);
  if (!valid) {
    return res.status(400).json({ error: validationError });
  }

  const startTime = Date.now();

  try {
    const response = await axios.get(normalized, {
      timeout: 8000,
      headers: {
        'User-Agent': 'PagePulseBot/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml',
      },
      maxRedirects: 5,
      responseType: 'text',
    });

    const responseTimeMs = Date.now() - startTime;
    const contentType = response.headers['content-type'] || '';

    if (!contentType.includes('text/html')) {
      return res.status(415).json({
        error: `URL returned non-HTML content (${contentType.split(';')[0].trim()}). Audit requires an HTML page.`,
      });
    }

    const parsedData = parseHtml(response.data);

    return res.json({
      url: normalized,
      httpStatus: response.status,
      responseTimeMs,
      ...parsedData,
    });

  } catch (err) {
    // Timeout — use RFC-correct 408 (not a custom 5xx code)
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      return res.status(408).json({ error: 'Request timed out after 8 seconds. The target server may be slow or unreachable.' });
    }

    // DNS resolution failure
    if (err.code === 'ENOTFOUND') {
      return res.status(400).json({ error: 'Domain name could not be resolved. Check that the URL is correct.' });
    }

    // Connection refused
    if (err.code === 'ECONNREFUSED') {
      return res.status(502).json({ error: 'Connection refused by the target server.' });
    }

    // Target server returned a non-2xx response
    if (err.response) {
      return res.status(502).json({
        error: `Target server responded with HTTP ${err.response.status}.`,
        httpStatus: err.response.status,
      });
    }

    // Unexpected error — log it server-side, return generic message
    console.error('[/api/audit] Unexpected error:', err.message);
    return res.status(500).json({ error: 'An unexpected error occurred while auditing the URL.' });
  }
}

// POST /api/audit  — body: { url: "..." }
app.post('/api/audit', (req, res) => runAudit(req.body.url, res));

// GET /api/audit?url=...  — convenient for curl / browser testing
app.get('/api/audit', (req, res) => runAudit(req.query.url, res));


// ── Start server (only when run directly, not when imported by tests) ───────
if (require.main === module) {
  app.listen(PORT, () => console.log(`Page Pulse running on http://localhost:${PORT}`));
}

module.exports = app;