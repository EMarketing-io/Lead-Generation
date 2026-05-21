const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');
const path = require('path');

let cachedToken = null;
let tokenExpiry = 0;

const REQUEST_INTERVAL_MS = 300;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const auth = new GoogleAuth({
    keyFile: path.resolve(process.env.SERVICE_ACCOUNT_PATH || './service-account.json'),
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();

  cachedToken = token;
  tokenExpiry = Date.now() + 55 * 60 * 1000;
  return cachedToken;
}

// Fetches all paginated results for a single query up to maxResults
async function searchPlaces(query, maxResults = 20) {
  const token = await getAccessToken();
  const results = [];
  let pageToken = null;

  do {
    const body = {
      textQuery: query,
      maxResultCount: 20, // API max per page
    };
    if (pageToken) body.pageToken = pageToken;

    const response = await axios.post(
      'https://places.googleapis.com/v1/places:searchText',
      body,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,nextPageToken',
          'Content-Type': 'application/json',
        },
      }
    );

    const places = response.data.places || [];
    for (const place of places) {
      results.push({
        timestamp: new Date().toISOString(),
        businessName: place.displayName?.text || '',
        phone: place.nationalPhoneNumber || '',
        website: place.websiteUri || '',
        email: '',
        address: place.formattedAddress || '',
        placeId: place.id,
      });
      if (results.length >= maxResults) break;
    }

    pageToken = response.data.nextPageToken || null;

    // Required delay between paginated requests
    if (pageToken && results.length < maxResults) {
      await sleep(REQUEST_INTERVAL_MS);
    }

  } while (pageToken && results.length < maxResults);

  return results;
}

async function searchMultipleKeywords(keywords, location = null, maxPerKeyword = 20) {
  const allLeads = [];
  const seen = new Set();

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
