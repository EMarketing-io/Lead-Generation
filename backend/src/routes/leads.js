const express = require('express');
const router = express.Router();
const { searchMultipleKeywords } = require('../services/mapsService');
const { appendLeads, getAllLeads, updateLeadStatuses, deleteLeads } = require('../services/sheetsService');
const { scrapeEmailsForLeads } = require('../services/emailScraperService');

// POST /api/leads/generate
router.post('/generate', async (req, res) => {
  try {
    const { keywords, location, maxPerKeyword = 20, scrapeEmails = false } = req.body;
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ error: 'Keywords array is required' });
    }
    let leads = await searchMultipleKeywords(keywords, location || null, maxPerKeyword);
    if (scrapeEmails && leads.length > 0) {
      leads = await scrapeEmailsForLeads(leads);
    }
    const { saved, skipped } = leads.length > 0
      ? await appendLeads(leads)
      : { saved: 0, skipped: 0 };
    res.json({ success: true, count: saved, skipped, leads });
  } catch (err) {
    console.error('Generate error:', err);
    res.status(500).json({ error: err.message });
  }
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
