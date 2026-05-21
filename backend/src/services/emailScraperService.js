const axios = require('axios');

const BLOCKED_PATTERNS = [
  '@example', '@w3.org', '@schema.org', '@sentry', '@wordpress',
  'noreply', 'no-reply', 'donotreply', 'your@', 'email@', 'info@your',
  'user@', 'test@', 'admin@your', '@yourdomain', '@domain',
];

function isRealEmail(email) {
  const lower = email.toLowerCase();
  return (
    email.length < 80 &&
    !BLOCKED_PATTERNS.some(p => lower.includes(p))
  );
}

async function fetchHtml(url) {
  const res = await axios.get(url, {
    timeout: 7000,
    maxRedirects: 4,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; LeadBot/1.0; +https://leadgen.local)',
      'Accept': 'text/html,application/xhtml+xml',
    },
    validateStatus: s => s < 400,
  });
  return typeof res.data === 'string' ? res.data : '';
}

function extractEmail(html) {
  // 1. mailto: links are most reliable
  const mailtoRe = /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi;
  for (const m of html.matchAll(mailtoRe)) {
    const email = m[1].toLowerCase();
    if (isRealEmail(email)) return email;
  }

  // 2. Plain text regex scan
  const plainRe = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const found = [...new Set((html.match(plainRe) || []).map(e => e.toLowerCase()))];
  return found.find(isRealEmail) || null;
}

async function scrapeEmail(websiteUrl) {
  if (!websiteUrl) return null;

  const base = websiteUrl.replace(/\/$/, '');
  const paths = ['', '/contact', '/contact-us', '/about-us', '/about'];

  for (const path of paths) {
    try {
      const html = await fetchHtml(base + path);
      const email = extractEmail(html);
      if (email) return email;
    } catch {
      // unreachable page or timeout — try next path
    }
  }
  return null;
}

const DELAY_MS = 400;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function scrapeEmailsForLeads(leads) {
  const results = [];
  for (const lead of leads) {
    const email = await scrapeEmail(lead.website);
    results.push({ ...lead, email: email || '' });
    await sleep(DELAY_MS);
  }
  return results;
}

module.exports = { scrapeEmailsForLeads };
