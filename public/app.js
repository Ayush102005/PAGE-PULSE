document.getElementById('auditForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const url = document.getElementById('urlInput').value;
  const statusMsg = document.getElementById('statusMessage');
  const resultsCard = document.getElementById('resultsCard');
  const submitBtn = document.getElementById('submitBtn');

  statusMsg.className = 'info';
  statusMsg.textContent = 'Auditing webpage... Please wait.';
  statusMsg.classList.remove('hidden');
  resultsCard.classList.add('hidden');
  submitBtn.disabled = true;

  try {
    const res = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'An unexpected error occurred.');
    }

    document.getElementById('httpStatus').textContent = data.httpStatus;
    document.getElementById('responseTime').textContent = `${data.responseTimeMs} ms`;
    document.getElementById('h1Count').textContent = data.h1Count;
    document.getElementById('imagesMissingAlt').textContent = data.imagesMissingAlt;
    document.getElementById('wordCount').textContent = data.approximateWordCount.toLocaleString();
    document.getElementById('pageTitle').textContent = data.title;
    document.getElementById('metaDescription').textContent = data.metaDescription;

    statusMsg.classList.add('hidden');
    resultsCard.classList.remove('hidden');
  } catch (err) {
    statusMsg.className = 'error';
    statusMsg.textContent = err.message;
  } finally {
    submitBtn.disabled = false;
  }
});