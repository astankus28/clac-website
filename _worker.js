/**
 * CLAC Community Feed — Cloudflare Worker
 *
 * Proxies requests to ltcle.org's public Events Calendar REST API,
 * adding CORS headers so our static site can fetch it client-side.
 *
 * HOW TO DEPLOY:
 *   Option A (easiest): Cloudflare Dashboard → Workers & Pages → Create Worker
 *                        → paste this file → Save & Deploy
 *                        → copy the worker URL (e.g. https://clac-feed.yourname.workers.dev)
 *                        → paste that URL into assets/feed.js as WORKER_URL
 *
 *   Option B: wrangler deploy (if you have wrangler CLI set up)
 *
 * The worker is already configured as Cloudflare Pages' _worker.js convention —
 * dropping it in the repo root means Pages auto-deploys it as a Worker too.
 * Route: /api/community-events → proxies ltcle.org
 */

const LTCLE_API = 'https://ltcle.org/wp-json/tribe/events/v1/events';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env, ctx) {

    // Only handle our /api/community-events route
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/community-events')) {
      return env.ASSETS.fetch(request);
    }

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Build upstream request
    const today  = new Date().toISOString().split('T')[0];
    const params = new URLSearchParams({
      per_page:   url.searchParams.get('per_page')   || '30',
      start_date: url.searchParams.get('start_date') || today,
      status:     'publish',
    });

    try {
      const upstream = await fetch(`${LTCLE_API}?${params}`, {
        headers: {
          'User-Agent': 'CLAC-CommunityFeed/1.0 (clacleveland.org)',
          'Accept':     'application/json',
        },
        // Ask Cloudflare to cache the upstream response for 30 min
        cf: { cacheTtl: 1800, cacheEverything: true },
      });

      if (!upstream.ok) {
        return new Response(
          JSON.stringify({ error: `ltcle.org returned HTTP ${upstream.status}` }),
          { status: upstream.status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }

      const data = await upstream.json();

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type':  'application/json',
          'Cache-Control': 'public, max-age=1800',
          ...CORS_HEADERS,
        },
      });

    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Upstream fetch failed', detail: err.message }),
        { status: 502, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }
  },
};
