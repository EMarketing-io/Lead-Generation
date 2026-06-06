const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');
const path = require('path');

let cachedToken = null;
let tokenExpiry = 0;

const PAGE_DELAY_MS = 400;        // between paginated pages of same query
const CELL_DELAY_MS = 350;        // between grid cells — keeps sustained QPS low over long runs
// Backoff ladder for rate limits / transient errors. Longer and deeper than a
// single short request needs, because a grid run makes thousands of calls and must
// ride through any 429/503 rather than failing the keyword.
const RETRY_DELAYS_MS = [2000, 5000, 12000, 25000, 40000, 60000];

// Google Places Text Search returns at most 60 results per query (3 pages × 20).
// A cell that returns the full 60 almost certainly has more businesses we can't
// see, so we subdivide it and search again.
const RESULT_CAP = 60;
const MAX_DEPTH = 4;              // deepest a single cell will subdivide
const MAX_CELLS = 200;           // safety budget of cell searches per keyword
const BBOX_EXPAND = 0.3;         // grow the seed bounding box by this fraction per side

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
              'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.location,nextPageToken',
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );
    } catch (err) {
      const status = err.response?.status;
      // Retry on rate limits (429), transient server errors (500/503), and bare
      // network failures (no response — ECONNRESET / timeout) — anything that a
      // long-running grid run should ride through instead of aborting the keyword.
      const retriable = status === 429 || status === 503 || status === 500 || !err.response;
      if (retriable && attempt < RETRY_DELAYS_MS.length) {
        // Honor a server-provided Retry-After (seconds) when present, else the ladder.
        const retryAfter = parseInt(err.response?.headers?.['retry-after'], 10);
        const wait = Number.isFinite(retryAfter) ? retryAfter * 1000 : RETRY_DELAYS_MS[attempt];
        console.warn(`Places API ${status || err.code || 'network error'}, retrying in ${wait}ms (attempt ${attempt + 1})…`);
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
}

// Run one text query (optionally restricted to a rectangle) and return ALL its
// paginated results (up to the 60-result cap Google imposes).
async function searchTextAllPages(query, restriction, token) {
  const leads = [];
  let pageToken = null;

  do {
    const body = { textQuery: query, maxResultCount: 20 };
    if (restriction) body.locationRestriction = restriction;
    if (pageToken) body.pageToken = pageToken;

    const response = await fetchPage(body, token);

    for (const place of response.data.places || []) {
      leads.push({
        timestamp:    new Date().toISOString(),
        businessName: place.displayName?.text || '',
        phone:        place.nationalPhoneNumber || '',
        website:      place.websiteUri || '',
        email:        '',
        address:      place.formattedAddress || '',
        placeId:      place.id,
        lat:          place.location?.latitude,
        lng:          place.location?.longitude,
      });
    }

    pageToken = response.data.nextPageToken || null;
    if (pageToken) await sleep(PAGE_DELAY_MS);

  } while (pageToken);

  return leads;
}

function boundsOf(items) {
  let minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity;
  for (const it of items) {
    minLat = Math.min(minLat, it.lat); maxLat = Math.max(maxLat, it.lat);
    minLng = Math.min(minLng, it.lng); maxLng = Math.max(maxLng, it.lng);
  }
  return { minLat, minLng, maxLat, maxLng };
}

function expandBounds(b, frac) {
  const dLat = (b.maxLat - b.minLat) * frac || 0.01; // ~1.1km fallback when degenerate
  const dLng = (b.maxLng - b.minLng) * frac || 0.01;
  return {
    minLat: b.minLat - dLat, maxLat: b.maxLat + dLat,
    minLng: b.minLng - dLng, maxLng: b.maxLng + dLng,
  };
}

// Split a cell into a 2×2 grid of child cells (depth + 1).
function splitCell(cell) {
  const midLat = (cell.minLat + cell.maxLat) / 2;
  const midLng = (cell.minLng + cell.maxLng) / 2;
  const depth = (cell.depth || 0) + 1;
  return [
    { minLat: cell.minLat, maxLat: midLat,      minLng: cell.minLng, maxLng: midLng,      depth },
    { minLat: cell.minLat, maxLat: midLat,      minLng: midLng,      maxLng: cell.maxLng, depth },
    { minLat: midLat,      maxLat: cell.maxLat, minLng: cell.minLng, maxLng: midLng,      depth },
    { minLat: midLat,      maxLat: cell.maxLat, minLng: midLng,      maxLng: cell.maxLng, depth },
  ];
}

function restrictionFromCell(cell) {
  return {
    rectangle: {
      low:  { latitude: cell.minLat, longitude: cell.minLng },
      high: { latitude: cell.maxLat, longitude: cell.maxLng },
    },
  };
}

// Adaptive grid search: seed with a broad query, then tile the area the results
// cluster in and dig into any cell that hits the result cap. Dedupes by place id.
// onProgress (optional) receives { cellsDone, found } after every cell.
async function searchPlaces(query, onProgress) {
  const token = await getAccessToken();
  const dedup = new Map(); // placeId -> lead

  const addAll = (leads) => {
    for (const l of leads) if (l.placeId) dedup.set(l.placeId, l);
  };

  // 1. Seed search across the whole (unrestricted) area.
  const seed = await searchTextAllPages(query, null, token);
  addAll(seed);
  let cellsDone = 1;
  onProgress?.({ cellsDone, found: dedup.size });

  // If we didn't hit the cap, we already have everything — gridding adds nothing.
  const located = seed.filter(l => typeof l.lat === 'number' && typeof l.lng === 'number');
  if (seed.length < RESULT_CAP || located.length === 0) {
    return finalize(dedup);
  }

  // 2. Build the search area from where the seed results cluster, expanded a bit.
  const bbox = expandBounds(boundsOf(located), BBOX_EXPAND);

  // 3. Adaptive subdivision: queue starts as a 2×2 split of the area.
  const queue = splitCell({ ...bbox, depth: 0 });

  while (queue.length && cellsDone < MAX_CELLS) {
    const cell = queue.shift();
    await sleep(CELL_DELAY_MS);

    const res = await searchTextAllPages(query, restrictionFromCell(cell), token);
    addAll(res);
    cellsDone++;
    onProgress?.({ cellsDone, found: dedup.size });

    // Cell is still saturated and we have depth budget — dig deeper.
    if (res.length >= RESULT_CAP && cell.depth < MAX_DEPTH) {
      queue.push(...splitCell(cell));
    }
  }

  return finalize(dedup);
}

// Drop the internal lat/lng helper fields before handing leads back.
function finalize(dedup) {
  return [...dedup.values()].map(({ lat, lng, ...lead }) => lead);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = { searchPlaces };
