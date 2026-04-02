/**
 * CLAC Worker v3
 * Routes:
 *   /api/community-events  — proxy ltcle.org
 *   /api/contact           — contact form via Resend
 *   /api/social-image      — generate Instagram image card
 *
 * Cron: daily at 8am ET — auto-publishes scheduled content
 */

const LTCLE_API = 'https://ltcle.org/wp-json/tribe/events/v1/events';
const SB_URL    = 'https://pipgdibeustnvbiayixg.supabase.co';
const SB_KEY    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpcGdkaWJldXN0bnZiaWF5aXhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMDczODMsImV4cCI6MjA5MDU4MzM4M30.dkzUwPGg4q3bF9MfjLmc0Huf69Y1sadXXojuA62005w';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

async function sbPatch(table, filter, data) {
  return fetch(`${SB_URL}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: {
      'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY,
      'Content-Type': 'application/json', 'Prefer': 'return=minimal',
    },
    body: JSON.stringify(data),
  });
}

async function sbInsert(table, data) {
  return fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY,
      'Content-Type': 'application/json', 'Prefer': 'return=minimal',
    },
    body: JSON.stringify(data),
  });
}

// ── CRON: Auto-publish scheduled content ─────────────────────────────────────
async function runScheduledPublish() {
  const today = new Date().toISOString().split('T')[0];
  console.log('Running scheduled publish for', today);

  // Publish events where publish_at <= today and published = false
  const evtRes = await sbPatch('events',
    `publish_at=lte.${today}&published=eq.false`,
    { published: true }
  );

  // Publish announcements same way
  const annRes = await sbPatch('announcements',
    `publish_at=lte.${today}&published=eq.false`,
    { published: true }
  );

  // Log it
  await sbInsert('activity_log', {
    id:        'cron-' + Date.now().toString(36),
    user_name: 'system',
    action:    'auto-published',
    entity:    'scheduled',
    detail:    `Ran scheduled publish for ${today}`,
  });

  console.log('Scheduled publish complete. Events:', evtRes.status, 'Announcements:', annRes.status);
}

// ── SOCIAL IMAGE GENERATOR ────────────────────────────────────────────────────
function generateEventSVG(title, date, location, color = '#2d4a33') {
  // Clean text for SVG
  const clean = (s) => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  // Word wrap title
  const words = clean(title).split(' ');
  const lines = [];
  let line = '';
  words.forEach(word => {
    if ((line + ' ' + word).trim().length > 22) {
      if (line) lines.push(line.trim());
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  });
  if (line) lines.push(line.trim());

  const titleY = lines.length === 1 ? 580 : lines.length === 2 ? 555 : 530;
  const titleLines = lines.slice(0, 3).map((l, i) =>
    `<text x="80" y="${titleY + i * 75}" font-family="Georgia, serif" font-size="62" font-weight="700" fill="#f2ede4">${l}</text>`
  ).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  <rect width="1080" height="1080" fill="${clean(color)}"/>
  <defs>
    <pattern id="g" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M60 0L0 0 0 60" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
    </pattern>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="60%" stop-color="rgba(0,0,0,0.7)"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#g)"/>
  <rect width="1080" height="1080" fill="url(#fade)"/>

  <!-- Logo area -->
  <rect x="80" y="80" width="6" height="100" fill="#c8903a"/>
  <text x="106" y="130" font-family="Georgia, serif" font-size="22" font-weight="700" fill="#f2ede4" letter-spacing="1">CLEVELAND LITHUANIAN</text>
  <text x="106" y="162" font-family="Georgia, serif" font-size="22" font-weight="700" fill="#f2ede4" letter-spacing="1">AMERICAN COMMUNITY</text>

  <!-- Event tag -->
  <rect x="80" y="440" width="160" height="2" fill="#c8903a"/>
  <text x="80" y="425" font-family="monospace" font-size="16" fill="#c8903a" letter-spacing="4">${clean(date)}</text>

  <!-- Title -->
  ${titleLines}

  <!-- Location -->
  <text x="80" y="${titleY + lines.slice(0,3).length * 75 + 30}" font-family="monospace" font-size="22" fill="rgba(242,237,228,0.6)" letter-spacing="1">📍 ${clean(location || 'Cleveland, Ohio')}</text>

  <!-- Bottom bar -->
  <rect x="0" y="1020" width="1080" height="60" fill="rgba(200,144,58,0.9)"/>
  <text x="80" y="1057" font-family="monospace" font-size="18" fill="#1a2e1e" letter-spacing="2">clacleveland.org</text>
  <text x="700" y="1057" font-family="monospace" font-size="16" fill="#1a2e1e" letter-spacing="1">#ClevelandLithuanian #CLAC</text>
</svg>`;
}

export default {
  // ── HTTP HANDLER ───────────────────────────────────────────────────────────
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ── SOCIAL IMAGE ──────────────────────────────────────────────────────────
    if (url.pathname === '/api/social-image' && request.method === 'POST') {
      try {
        const { title, date, location, color } = await request.json();
        const svg = generateEventSVG(title, date, location, color);
        return new Response(svg, {
          status: 200,
          headers: { 'Content-Type': 'image/svg+xml', ...CORS },
        });
      } catch(e) {
        return json({ error: e.message }, 500);
      }
    }

    // ── CONTACT FORM ──────────────────────────────────────────────────────────
    if (url.pathname === '/api/contact' && request.method === 'POST') {
      try {
        const { name, email, subject, message } = await request.json();
        if (!name || !email || !message) return json({ error: 'Missing fields' }, 400);

        const toEmail = env.CONTACT_TO_EMAIL || 'astankus28@gmail.com';
        const apiKey  = env.RESEND_API_KEY;

        if (!apiKey) return json({ ok: true });

        const body = `New message from clacleveland.org\n\nName:    ${name}\nEmail:   ${email}\nSubject: ${subject}\n\nMessage:\n${message}\n\n---\nReply to this email to respond to ${name}.`;

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'CLAC Website <onboarding@resend.dev>',
            to: [toEmail], reply_to: email,
            subject: `[CLAC] ${subject} — from ${name}`,
            text: body,
          }),
        });

        if (!res.ok) return json({ error: 'Email failed' }, 500);
        return json({ ok: true });
      } catch(e) {
        return json({ error: 'Server error' }, 500);
      }
    }

    // ── COMMUNITY EVENTS ──────────────────────────────────────────────────────
    if (url.pathname.startsWith('/api/community-events')) {
      const today  = new Date().toISOString().split('T')[0];
      const params = new URLSearchParams({
        per_page:   url.searchParams.get('per_page')   || '30',
        start_date: url.searchParams.get('start_date') || today,
        status:     'publish',
      });
      try {
        const upstream = await fetch(`${LTCLE_API}?${params}`, {
          headers: { 'User-Agent': 'CLAC-CommunityFeed/1.0', 'Accept': 'application/json' },
          cf: { cacheTtl: 1800, cacheEverything: true },
        });
        if (!upstream.ok) return json({ error: `ltcle.org HTTP ${upstream.status}` }, upstream.status);
        const data = await upstream.json();
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=1800', ...CORS },
        });
      } catch(err) {
        return json({ error: 'Upstream fetch failed', detail: err.message }, 502);
      }
    }

    return env.ASSETS.fetch(request);
  },

  // ── CRON HANDLER ───────────────────────────────────────────────────────────
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runScheduledPublish());
  },
};
