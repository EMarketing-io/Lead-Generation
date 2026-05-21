const express = require('express');
const router = express.Router();
const { searchPlaces } = require('../services/mapsService');
const { appendLeads, getAllLeads, updateLeadStatuses, deleteLeads } = require('../services/sheetsService');
const { scrapeEmailsForLeads } = require('../services/emailScraperService');

const KEYWORD_DELAY_MS = 600; // pause between keywords to stay well under rate limits

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// POST /api/leads/generate — SSE streaming
router.post('/generate', async (req, res) => {
  const { keywords, scrapeEmails = false } = req.body;
  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ error: 'Keywords array is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders();

  function send(data) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  const allLeads = [];
  const kwDurations = []; // actual ms per completed keyword (for ETA calc)

  for (let i = 0; i < keywords.length; i++) {
    const keyword = keywords[i];
    const kwStart = Date.now();

    send({ type: 'searching', keyword, index: i, total: keywords.length });

    let found = [];
    try {
      found = await searchPlaces(keyword);
    } catch (err) {
      console.error(`searchPlaces error for "${keyword}":`, err.message);
      send({ type: 'keyword_error', keyword, index: i, total: keywords.length, message: err.message });
      kwDurations.push(Date.now() - kwStart);
      if (i < keywords.length - 1) await sleep(KEYWORD_DELAY_MS);
      continue;
    }

    if (scrapeEmails && found.length > 0) {
      send({ type: 'scraping', keyword, index: i, total: keywords.length, count: found.length });
      try {
        found = await scrapeEmailsForLeads(found);
      } catch (err) {
        console.error(`email scrape error for "${keyword}":`, err.message);
      }
    }

    allLeads.push(...found);

    const elapsed = Date.now() - kwStart;
    kwDurations.push(elapsed);
    const avgMs = kwDurations.reduce((a, b) => a + b, 0) / kwDurations.length;
    const remaining = keywords.length - i - 1;
    const etaMs = Math.round(remaining * avgMs);

    send({
      type: 'keyword_done',
      keyword,
      index: i,
      total: keywords.length,
      found: found.length,
      totalSoFar: allLeads.length,
      elapsedMs: elapsed,
      etaMs,
    });

    if (i < keywords.length - 1) await sleep(KEYWORD_DELAY_MS);
  }

  send({ type: 'saving' });

  let saved = 0;
  let skipped = 0;
  try {
    if (allLeads.length > 0) {
      const result = await appendLeads(allLeads);
      saved = result.saved;
      skipped = result.skipped;
    }
  } catch (err) {
    console.error('appendLeads error:', err.message);
    send({ type: 'error', message: `Failed to save leads: ${err.message}` });
  }

  send({ type: 'done', saved, skipped, leads: allLeads });
  res.end();
});

// GET /api/leads
router.get('/', async (req, res) => {
  try {
    const leads = await getAllLeads();
    res.json({ leads, count: leads.length });
  } catch (err) {
    console.error('Fetch leads error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/export — CSV download
router.get('/export', async (req, res) => {
  try {
    const leads = await getAllLeads();
    const esc = v => `"${String(v).replace(/"/g, '""')}"`;
    const headers = ['Timestamp', 'Keyword', 'Business Name', 'Phone', 'Website', 'Email', 'Address', 'Status'];
    const rows = leads.map(l => [
      esc(l.timestamp), esc(l.keyword), esc(l.businessName), esc(l.phone),
      esc(l.website), esc(l.email), esc(l.address), esc(l.status),
    ].join(','));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
    res.send([headers.join(','), ...rows].join('\n'));
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/leads/status — bulk update status
router.patch('/status', async (req, res) => {
  try {
    const { rowIndices, status } = req.body;
    if (!Array.isArray(rowIndices) || rowIndices.length === 0) {
      return res.status(400).json({ error: 'rowIndices array required' });
    }
    if (!['real', 'fake', ''].includes(status)) {
      return res.status(400).json({ error: 'status must be "real", "fake", or ""' });
    }
    await updateLeadStatuses(rowIndices, status);
    res.json({ success: true });
  } catch (err) {
    console.error('Status update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leads — bulk delete by row indices
router.delete('/', async (req, res) => {
  try {
    const { rowIndices } = req.body;
    if (!Array.isArray(rowIndices) || rowIndices.length === 0) {
      return res.status(400).json({ error: 'rowIndices array required' });
    }
    await deleteLeads(rowIndices);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
