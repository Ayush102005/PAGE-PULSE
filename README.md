# ⚡ Page Pulse

> Instant webpage health & SEO audit — powered by zero guesswork.

Page Pulse is a lightweight web tool that audits any public URL in seconds.  
Enter a URL, and it returns a structured JSON report covering HTTP status, response time, page title, meta description, H1 count, images missing alt text, approximate word count, canonical URL, Open Graph tags, and robots meta — all without a browser.

**Live demo:** _[https://page-pulse-lime.vercel.app](https://page-pulse-lime.vercel.app)_  
**Repository:** _[https://github.com/Ayush102005/PAGE-PULSE](https://github.com/Ayush102005/PAGE-PULSE)_

---

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/Ayush102005/PAGE-PULSE.git
cd PAGE-PULSE

# 2. Install dependencies
npm install

# 3. Start the server (development)
npm run dev

# 4. Open in browser
open http://localhost:3000
```

> **Requirements:** Node.js ≥ 18

---

## Running Tests

```bash
npm test
```

Three test suites run in sequence (no network calls required):

| Suite | File | Coverage |
|-------|------|----------|
| HTML Parser | `tests/audit.test.js` | 10 tests — happy path, edge cases (no-body, no-images), + 3 typed failures |
| URL Validator | `tests/validator.test.js` | 16 tests — valid inputs, malformed, SSRF ranges, scheme-blocking |
| API Integration | `tests/api.test.js` | 11 tests — health check, POST validation, GET endpoint, SSRF rejection |

---

## API Contract

### `POST /api/audit`

Audits a URL and returns a structured JSON report.

**Request**

```http
POST /api/audit
Content-Type: application/json

{
  "url": "https://example.com"
}
```

> The `https://` protocol prefix is optional — it is auto-prepended if absent.

### `GET /api/audit?url=...`

Convenience variant — identical report, ideal for `curl`, browser testing, or shareable links.

```bash
curl "https://page-pulse-lime.vercel.app/api/audit?url=example.com"
```

**Success Response** `200 OK`

```json
{
  "url": "https://example.com",
  "httpStatus": 200,
  "responseTimeMs": 312,
  "title": "Example Domain",
  "metaDescription": "N/A",
  "h1Count": 1,
  "imagesMissingAlt": 0,
  "approximateWordCount": 221,
  "canonical": "https://example.com/",
  "ogTitle": "N/A",
  "ogDescription": "N/A",
  "robotsMeta": "N/A"
}
```

**Error Responses**

| Status | Condition | Example `error` message |
|--------|-----------|------------------------|
| `400`  | Missing or invalid URL | `"Invalid URL format provided."` |
| `400`  | Private/loopback address (SSRF guard) | `"Requests to private or loopback addresses are not allowed."` |
| `400`  | DNS resolution failure | `"Domain name could not be resolved."` |
| `408`  | Request timed out (> 8 s) | `"Request timed out after 8 seconds."` |
| `415`  | Response is not HTML | `"URL returned non-HTML content (application/json)."` |
| `502`  | Target server error or connection refused | `"Target server responded with HTTP 503."` |
| `500`  | Unexpected server error | `"An unexpected error occurred."` |

All error responses share the same shape:

```json
{ "error": "Human-readable description of what went wrong." }
```

---

### `GET /api/health`

Health-check endpoint for uptime monitoring.

**Response** `200 OK`

```json
{ "status": "ok", "timestamp": "2025-01-01T12:00:00.000Z" }
```

---

## Design Decisions

### 1 — Cheerio over Puppeteer (or Playwright)

**Decision:** Parse HTML with [Cheerio](https://cheerio.js.org/) — a server-side jQuery-like library — rather than a headless browser.

**Reasoning:**  
Puppeteer spins up a full Chromium instance (~280 MB). On free-tier hosting (Vercel serverless, Render free) that means cold starts measured in seconds and memory limits that kill the process. Cheerio is a ~1 MB HTML parser that runs in milliseconds.  
The trade-off is that JavaScript-rendered content is invisible to Cheerio. For the stated goal — auditing HTML SEO signals — this is entirely acceptable, because those signals (title, meta, canonical) are always server-side rendered. A future enhancement could offer a "deep scan" mode via Puppeteer on a separate paid tier.

---

### 2 — HTTP 408 for Timeouts (not a custom 5xx code)

**Decision:** Return `408 Request Timeout` when the outbound fetch exceeds 8 seconds.

**Reasoning:**  
The original code returned `540` — a non-standard code invented in-house. Using an RFC-7231 standard status code (408) means API consumers can handle it with standard HTTP logic (`if (status === 408)`) rather than needing to read our documentation for every edge case. It also plays nicely with monitoring tools, CDNs, and retry logic libraries that understand standard status codes. `502 Bad Gateway` is used for upstream server errors for the same reason — it accurately describes the relationship (our server is acting as a gateway to the target).

---

### 3 — URL Validation Extracted to Its Own Module

**Decision:** URL normalisation and validation lives in `utils/validator.js`, not inline in `server.js`.

**Reasoning:**  
Keeping validation logic inside the route handler means it is impossible to unit-test without spinning up an Express server (and mocking `axios`). By extracting it to a pure function `isValidUrl(rawUrl) → { valid, normalized, error }`, we get:
- **Testability:** `validator.test.js` tests it with 16 cases using no HTTP layer at all.
- **Reusability:** If we add a `GET /api/audit?url=` query-param variant, the same function is called with zero duplication.
- **Single Responsibility:** `server.js` orchestrates; `validator.js` validates; `parser.js` parses. Each module has exactly one job.

---

### 4 — SSRF Protection in the Validator Layer

**Decision:** URL validation rejects requests to private/loopback network addresses before any HTTP fetch is attempted.

**Reasoning:**  
Without this guard, anyone could POST `{ "url": "http://192.168.1.1/admin" }` and use Page Pulse as a proxy to scan internal infrastructure. The fix is a small but critical security control: `isPrivateHost()` checks the parsed hostname against all RFC-1918 private ranges (10.x, 172.16-31.x, 192.168.x), loopback (127.x, `localhost`), link-local (169.254.x), and IPv6 equivalents — and returns a 400 before any network socket is opened. The check lives in `validator.js` rather than `server.js` so it is independently unit-testable with dedicated SSRF test cases.

---

## Project Structure

```
page-pulse/
├── server.js               # Express app + API routes
├── utils/
│   ├── parser.js           # Cheerio HTML parsing logic
│   └── validator.js        # URL normalisation & validation
├── public/
│   ├── index.html          # Frontend UI
│   ├── style.css           # Styles (glassmorphism, animations)
│   └── app.js              # Frontend logic (fetch, render, copy)
├── tests/
│   ├── audit.test.js       # Parser unit tests (8 cases)
│   ├── validator.test.js   # Validator unit tests (9 cases)
│   └── api.test.js         # API integration tests (3 cases)
└── package.json
```

---

## What I'd Change With Another Day

1. **Stream parsing** — Currently the full HTML body is buffered into memory before parsing. For large pages (> 5 MB), this is wasteful. Cheerio supports streaming via `cheerio.fromStream()`, which would let us pipe the `axios` response and parse incrementally, stopping early once we've seen the `<head>`.

2. **Result caching** — Auditing the same URL twice in 60 seconds returns stale data at the cost of another round-trip. A Redis-backed cache (or even an in-process LRU with a 60-second TTL) would halve response time for repeat requests and reduce rate-limiting risk on popular targets.

3. **Headless "deep scan" option** — A `?mode=deep` flag that spawns a Puppeteer instance for JavaScript-rendered pages. This would let the tool audit SPAs (React, Vue, Angular apps) that render all their HTML client-side — currently invisible to Cheerio.

4. **DNS-level SSRF re-check** — The current SSRF guard checks the hostname string before the fetch. A determined attacker could use a domain they control that resolves to a private IP (DNS rebinding). A production-grade fix would also verify the resolved IP after DNS lookup, before the TCP connection is made.

---

## License

MIT
