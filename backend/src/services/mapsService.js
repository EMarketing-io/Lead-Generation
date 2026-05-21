const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');
const path = require('path');

// Cache the access token so we don't re-auth on every request
let cachedToken = null;
let tokenExpiry = 0;

// Google Places API (New) allows ~10 requests/second; we throttle to 1 req/200ms
const REQUEST_INTERVAL_MS = 200;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const auth = new GoogleAuth({
    keyFile: path.resolve(process.env.SERVICE_ACCOUNT_PATH || './service-account.json'),
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();

  cachedToken = token;
  tokenExpiry = Date.now() + 55 * 60 * 1000; // refresh 5 min before 1-hour expiry
  return cachedToken;
}

async function searchPlaces(query, maxResults = 20) {
  const token = await getAccessToken();

  const response = await axios.post(
    'https://places.googleapis.com/v1/places:searchText',
    {
      textQuery: query,
      maxResultCount: Math.min(maxResults, 20),
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri',
        'Content-Type': 'application/json',
      },
    }
  );

  return (response.data.places || []).map(place => ({
    timestamp: new Date().toISOString(),
    businessName: place.displayName?.text || '',
    phone: place.nationalPhoneNumber || '',
    website: place.websiteUri || '',
    email: '',
    address: place.formattedAddress || '',
    placeId: place.id,
  }));
}

async function searchMultipleKeywords(keywords, location = null, maxPerKeyword = 20) {
  const allLeads = [];
  const seen = new Set(); // deduplicate by place ID

  for (let i = 0; i < keywords.length; i++) {
    const kw = keywords[i].trim();
    if (!kw) continue;

    const query = location ? `${kw} in ${location}` : kw;

    try {
      const results = await searchPlaces(query, maxPerKeyword);
      for (const lead of results) {
        if (!seen.has(lead.placeId)) {
          seen.add(lead.placeId);
          allLeads.push({ ...lead, keyword: kw });
        }
      }
    } catch (err) {
      console.error(`Error searching "${kw}": ${err.message}`);
    }

    // Respect Places API quota: 1 request per REQUEST_INTERVAL_MS
    if (i < keywords.length - 1) {
      await sleep(REQUEST_INTERVAL_MS);
    }
  }

  return allLeads;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = { searchMultipleKeywords };
