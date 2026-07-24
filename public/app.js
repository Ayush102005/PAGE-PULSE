/**
 * app.js  —  Page Pulse frontend logic
 *
 * Responsibilities:
 *  - Submit URL to /api/audit and render the JSON report
 *  - Color-code each metric based on thresholds (good / warn / bad)
 *  - Copy JSON report to clipboard
 *  - Handle all error states gracefully
 */

// ── Thresholds ─────────────────────────────────────────────────────────────
// Each key maps to { good, warn } — values above warn are flagged bad.
const THRESHOLDS = {
  responseTimeMs: { good: 800,  warn: 2500 },  // ms
  h1Count:        { good: 1,    warn: 1    },  // exactly 1 is ideal
  imagesMissingAlt: { good: 0,  warn: 3   },  // 0 missing is perfect
};

/**
 * Returns 'good' | 'warn' | 'bad' for a given metric.
 * H1 count is special: exactly 1 is good, 0 or >1 is bad.
 */
function classify(key, value) {
  if (key === 'h1Count') {
    if (value === 1) return 'good';
    if (value === 0) return 'warn';
    return 'bad';  // multiple H1s is an SEO anti-pattern
  }
  if (key === 'responseTimeMs') {
    if (value <= THRESHOLDS.responseTimeMs.good) return 'good';
    if (value <= THRESHOLDS.responseTimeMs.warn) return 'warn';
    return 'bad';
  }
  if (key === 'imagesMissingAlt') {
    if (value === 0) return 'good';
    if (value <= THRESHOLDS.imagesMissingAlt.warn) return 'warn';
    return 'bad';
  }
  return '';
}

// ── DOM refs ───────────────────────────────────────────────────────────────
const form        = document.getElementById('auditForm');
const urlInput    = document.getElementById('urlInput');
const submitBtn   = document.getElementById('submitBtn');
const btnText     = document.getElementById('btnText');
const btnSpinner  = document.getElementById('btnSpinner');
const statusMsg   = document.getElementById('statusMessage');
const resultsCard = document.getElementById('resultsCard');
const copyBtn     = document.getElementById('copyBtn');
const copyBtnText = document.getElementById('copyBtnText');

let lastReport = null;  // stash the latest report for copy-JSON

// ── Helpers ────────────────────────────────────────────────────────────────
function showStatus(message, type = 'info') {
  statusMsg.textContent = message;
  statusMsg.className = `status-msg ${type}`;
  statusMsg.classList.remove('hidden');
}

function hideStatus() {
  statusMsg.classList.add('hidden');
}

function setLoading(loading) {
  submitBtn.disabled = loading;
  btnText.textContent = loading ? 'Auditing…' : 'Audit Page';
  btnSpinner.classList.toggle('hidden', !loading);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  if (text === 'N/A') {
    el.classList.add('na');
  } else {
    el.classList.remove('na');
  }
}

function setMetric(metricId, domId, value, displayValue, classifyKey) {
  const metricEl = document.getElementById(metricId);
  const valEl    = document.getElementById(domId);
  if (!metricEl || !valEl) return;

  valEl.textContent = displayValue;

  // Remove existing badge classes
  metricEl.classList.remove('good', 'warn', 'bad');

  if (classifyKey) {
    const badge = classify(classifyKey, value);
    if (badge) metricEl.classList.add(badge);
  }
}

// ── Form submit ────────────────────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const url = urlInput.value.trim();
  if (!url) return;

  setLoading(true);
  showStatus('🔍 Fetching and analysing the page…', 'info');
  resultsCard.classList.add('hidden');
  lastReport = null;

  try {
    const res = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'An unexpected error occurred.');
    }

    // ── Populate metrics ──────────────────────────────────────────────────
    setMetric('m-status',  'httpStatus',      data.httpStatus,           data.httpStatus,                     null);
    setMetric('m-time',    'responseTime',    data.responseTimeMs,       `${data.responseTimeMs} ms`,         'responseTimeMs');
    setMetric('m-h1',      'h1Count',         data.h1Count,              data.h1Count,                        'h1Count');
    setMetric('m-alt',     'imagesMissingAlt',data.imagesMissingAlt,     data.imagesMissingAlt,               'imagesMissingAlt');
    setMetric('m-words',   'wordCount',       data.approximateWordCount, data.approximateWordCount.toLocaleString(), null);

    // HTTP status colour
    const statusEl = document.getElementById('m-status');
    statusEl.classList.remove('good', 'warn', 'bad');
    if (data.httpStatus >= 200 && data.httpStatus < 300) statusEl.classList.add('good');
    else if (data.httpStatus >= 300 && data.httpStatus < 400) statusEl.classList.add('warn');
    else statusEl.classList.add('bad');

    // ── Populate detail rows ──────────────────────────────────────────────
    setText('pageTitle',      data.title);
    setText('metaDescription',data.metaDescription);
    setText('canonicalUrl',   data.canonical);
    setText('ogTitle',        data.ogTitle);
    setText('ogDescription',  data.ogDescription);
    setText('robotsMeta',     data.robotsMeta);

    // ── Audited URL label ─────────────────────────────────────────────────
    document.getElementById('auditedUrl').textContent = data.url;

    lastReport = data;
    hideStatus();
    resultsCard.classList.remove('hidden');

    // Smooth scroll on mobile
    if (window.innerWidth < 640) {
      setTimeout(() => resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }

  } catch (err) {
    showStatus(`⚠️ ${err.message}`, 'error');
    resultsCard.classList.add('hidden');
  } finally {
    setLoading(false);
  }
});

// ── Copy JSON button ───────────────────────────────────────────────────────
copyBtn.addEventListener('click', async () => {
  if (!lastReport) return;

  try {
    await navigator.clipboard.writeText(JSON.stringify(lastReport, null, 2));
    copyBtnText.textContent = '✓ Copied!';
    copyBtn.classList.add('copied');
    setTimeout(() => {
      copyBtnText.textContent = '⎘ Copy JSON';
      copyBtn.classList.remove('copied');
    }, 2000);
  } catch {
    // Fallback for browsers without clipboard API
    copyBtnText.textContent = 'Copy failed';
    setTimeout(() => { copyBtnText.textContent = '⎘ Copy JSON'; }, 2000);
  }
});