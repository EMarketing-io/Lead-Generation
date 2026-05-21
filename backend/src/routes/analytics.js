const express = require('express');
const router = express.Router();
const { getAllLeads } = require('../services/sheetsService');

// GET /api/analytics
router.get('/', async (req, res) => {
  try {
    const leads = await getAllLeads();
    const now = new Date();
    const todayStr = now.toDateString();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const leadsToday = leads.filter(l => new Date(l.timestamp).toDateString() === todayStr);
    const leadsThisWeek = leads.filter(l => new Date(l.timestamp) >= weekAgo);
    const leadsThisMonth = leads.filter(l => new Date(l.timestamp) >= monthAgo);

    // Daily buckets for last 30 days
    const byDate = {};
    leadsThisMonth.forEach(lead => {
      const d = new Date(lead.timestamp);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      byDate[label] = (byDate[label] || 0) + 1;
    });

    const chartData = Object.entries(byDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      total: leads.length,
      today: leadsToday.length,
      thisWeek: leadsThisWeek.length,
      thisMonth: leadsThisMonth.length,
      withPhone: leads.filter(l => l.phone).length,
      withWebsite: leads.filter(l => l.website).length,
      chartData,
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
