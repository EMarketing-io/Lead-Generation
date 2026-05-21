const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');
const path = require('path');

let cachedToken = null;
let tokenExpiry = 0;

const PAGE_DELAY_MS = 400;       // between paginated pages of same query
const RETRY_DELAYS_MS = [2000, 5000, 12000]; // 429 backoff ladder

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

async function fetchPage(body, token) {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await axios.post(
        'https://places.googleapis.com/v1/places:searchText',
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Goog-FieldMask':
              'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,nextPageToken',
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );
    } catch (err) {
      const status = err.response?.status;
      if ((status === 429 || status === 503) && attempt < RETRY_DELAYS_MS.length) {
        console.warn(`Rate limit hit (${status}), retrying in ${RETRY_DELAYS_MS[attempt]}ms…`);
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw err;
    }
  }
}

// Returns all paginated results for a single query text
async function searchPlaces(query) {
  const token = await getAccessToken();
  const results = [];
  let pageToken = null;

  do {
    const body = { textQuery: query, maxResultCount: 20 };
    if (pageToken) body.pageToken = pageToken;

    const response = await fetchPage(body, token);

    for (const place of response.data.places || []) {
      results.push({
        timestamp: new Date().toISOString(),
        businessName: place.displayName?.text || '',
        phone:        place.nationalPhoneNumber || '',
        website:      place.websiteUri || '',
        email:        '',
        address:      place.formattedAddress || '',
        placeId:      place.id,
      });
    }

    pageToken = response.data.nextPageToken || null;
    if (pageToken) await sleep(PAGE_DELAY_MS);

  } while (pageToken);

  return results;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = { searchPlaces };
