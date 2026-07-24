const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { parseHtml } = require('./utils/parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.post('/api/audit', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required.' });
  }

  let formattedUrl = url.trim();
  if (!/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = 'https://' + formattedUrl;
  }

  try {
    new URL(formattedUrl);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL format provided.' });
  }

  const startTime = Date.now();
  try {
    const response = await axios.get(formattedUrl, {
      timeout: 8000,
      headers: {
        'User-Agent': 'PagePulseBot/1.0 (+https://digitalheroesco.com)',
        'Accept': 'text/html,application/xhtml+xml,application/xml'
      },
      maxRedirects: 5,
      responseType: 'text'
    });

    const responseTime = Date.now() - startTime;
    const contentType = response.headers['content-type'] || '';

    if (!contentType.includes('text/html')) {
      return res.status(415).json({
        error: `URL returned non-HTML content (${contentType.split(';')[0]}). Audit canceled.`
      });
    }

    const parsedData = parseHtml(response.data);

    return res.json({
      url: formattedUrl,
      httpStatus: response.status,
      responseTimeMs: responseTime,
      ...parsedData
    });

  } catch (err) {
    if (err.code === 'ECONNABORTED') {
      return res.status(540).json({ error: 'Request timed out after 8 seconds.' });
    }
    if (err.response) {
      return res.status(err.response.status).json({
        error: `Target server responded with HTTP status ${err.response.status}.`
      });
    }
    if (err.code === 'ENOTFOUND') {
      return res.status(404).json({ error: 'Domain name could not be resolved (DNS failure).' });
    }
    return res.status(500).json({ error: `Failed to audit URL: ${err.message}` });
  }
});

app.listen(PORT, () => console.log(`Page Pulse running on http://localhost:${PORT}`));