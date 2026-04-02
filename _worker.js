/**
 * CLAC Worker — Final
 * Routes:
 *   /api/community-events  — proxy ltcle.org
 *   /api/contact           — contact form via Resend
 *   /api/social-image      — generate Instagram image SVG
 *   /api/generate-week     — trigger week of content generation
 *
 * Crons:
 *   0 13 * * *  — 8am ET: auto-publish scheduled events/announcements + post today's social content
 */

const LTCLE_API = 'https://ltcle.org/wp-json/tribe/events/v1/events';
const SB_URL    = 'https://pipgdibeustnvbiayixg.supabase.co';
const SB_KEY    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpcGdkaWJldXN0bnZiaWF5aXhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMDczODMsImV4cCI6MjA5MDU4MzM4M30.dkzUwPGg4q3bF9MfjLmc0Huf69Y1sadXXojuA62005w';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const SB_HEADERS = {
  'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY,
  'Content-Type': 'application/json',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

async function sbGet(table, params = '') {
  const res = await fetch(`${SB_URL}/rest/v1/${table}${params}`, { headers: SB_HEADERS });
  return res.json();
}

async function sbPatch(table, filter, data) {
  return fetch(`${SB_URL}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: { ...SB_HEADERS, 'Prefer': 'return=minimal' },
    body: JSON.stringify(data),
  });
}

async function sbInsert(table, data) {
  return fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...SB_HEADERS, 'Prefer': 'return=minimal' },
    body: JSON.stringify(data),
  });
}

// ── SOCIAL IMAGE GENERATOR ────────────────────────────────────────────────────
function generateEventSVG(title, date, location, color = '#2d4a33') {
  const clean = (s) => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const words = clean(title).split(' ');
  const lines = [];
  let line = '';
  words.forEach(word => {
    if ((line + ' ' + word).trim().length > 22) { if (line) lines.push(line.trim()); line = word; }
    else line = (line + ' ' + word).trim();
  });
  if (line) lines.push(line.trim());
  const titleY = lines.length === 1 ? 580 : lines.length === 2 ? 555 : 530;
  const titleLines = lines.slice(0, 3).map((l, i) =>
    `<text x="80" y="${titleY + i * 75}" font-family="Georgia, serif" font-size="62" font-weight="700" fill="#f2ede4">${l}</text>`
  ).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  <rect width="1080" height="1080" fill="${clean(color)}"/>
  <defs>
    <pattern id="g" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0L0 0 0 60" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/></pattern>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(0,0,0,0)"/><stop offset="60%" stop-color="rgba(0,0,0,0.7)"/></linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#g)"/>
  <rect width="1080" height="1080" fill="url(#fade)"/>
  <rect x="80" y="80" width="6" height="100" fill="#c8903a"/>
  <text x="106" y="130" font-family="Georgia, serif" font-size="22" font-weight="700" fill="#f2ede4" letter-spacing="1">CLEVELAND LITHUANIAN</text>
  <text x="106" y="162" font-family="Georgia, serif" font-size="22" font-weight="700" fill="#f2ede4" letter-spacing="1">AMERICAN COMMUNITY</text>
  <rect x="80" y="440" width="160" height="2" fill="#c8903a"/>
  <text x="80" y="425" font-family="monospace" font-size="16" fill="#c8903a" letter-spacing="4">${clean(date)}</text>
  ${titleLines}
  <text x="80" y="${titleY + Math.min(lines.length,3) * 75 + 30}" font-family="monospace" font-size="22" fill="rgba(242,237,228,0.6)" letter-spacing="1">📍 ${clean(location || 'Cleveland, Ohio')}</text>
  <rect x="0" y="1020" width="1080" height="60" fill="rgba(200,144,58,0.9)"/>
  <text x="80" y="1057" font-family="monospace" font-size="18" fill="#1a2e1e" letter-spacing="2">clacleveland.org</text>
  <text x="700" y="1057" font-family="monospace" font-size="16" fill="#1a2e1e" letter-spacing="1">#ClevelandLithuanian</text>
</svg>`;
}

// ── CONTENT SVG (for non-event posts) ────────────────────────────────────────
function generateContentSVG(category, headline, body) {
  const clean = (s) => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const colors = { history:'#1a2e3a', recipe:'#2d1a0e', trivia:'#2e1a38', language:'#1a2e1e', sports:'#0e1a2d', culture:'#2d2e1a', tradition:'#2e1a1a' };
  const bg = colors[category] || '#1a2e1e';

  // Wrap headline
  const words = clean(headline).split(' ');
  const lines = []; let line = '';
  words.forEach(w => { if ((line+' '+w).trim().length > 24) { if(line) lines.push(line.trim()); line=w; } else line=(line+' '+w).trim(); });
  if(line) lines.push(line.trim());

  // Wrap body text (max 3 lines of ~50 chars)
  const bwords = clean(body).split(' ');
  const blines = []; let bline = '';
  bwords.forEach(w => { if((bline+' '+w).trim().length > 48) { if(blines.length < 6) blines.push(bline.trim()); bline=w; } else bline=(bline+' '+w).trim(); });
  if(bline && blines.length < 6) blines.push(bline.trim());

  const catLabel = category.toUpperCase().replace('-', ' ');
  const headY = 480;
  const headLines = lines.slice(0,3).map((l,i) =>
    `<text x="80" y="${headY + i*68}" font-family="Georgia, serif" font-size="52" font-weight="700" fill="#f2ede4">${l}</text>`
  ).join('\n');
  const bodyStartY = headY + Math.min(lines.length,3)*68 + 40;
  const bodyLines = blines.slice(0,5).map((l,i) =>
    `<text x="80" y="${bodyStartY + i*36}" font-family="Arial, sans-serif" font-size="26" fill="rgba(242,237,228,0.7)">${l}</text>`
  ).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  <rect width="1080" height="1080" fill="${bg}"/>
  <defs>
    <pattern id="g" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0L0 0 0 60" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/></pattern>
  </defs>
  <rect width="1080" height="1080" fill="url(#g)"/>
  <rect x="0" y="0" width="1080" height="8" fill="#c8903a"/>
  <text x="80" y="100" font-family="Georgia, serif" font-size="20" font-weight="700" fill="#f2ede4" letter-spacing="2">CLEVELAND LITHUANIAN AMERICAN COMMUNITY</text>
  <rect x="80" y="130" width="80" height="2" fill="#c8903a"/>
  <text x="80" y="200" font-family="monospace" font-size="18" fill="#c8903a" letter-spacing="6">${catLabel}</text>
  ${headLines}
  ${bodyLines}
  <rect x="0" y="1020" width="1080" height="60" fill="rgba(200,144,58,0.85)"/>
  <text x="80" y="1057" font-family="monospace" font-size="16" fill="#1a2e1e" letter-spacing="2">clacleveland.org · #ClevelandLithuanian #CLAC</text>
</svg>`;
}

// ── SCHEDULED CONTENT POSTER ──────────────────────────────────────────────────
async function postTodaysContent(env) {
  const today = new Date().toISOString().split('T')[0];
  const posts = await sbGet('content_calendar', `?scheduled_for=eq.${today}&status=eq.approved&select=*`);
  if (!posts || !posts.length) {
    console.log('No approved posts for today:', today);
    return;
  }

  const FB_TOKEN   = env.FB_PAGE_TOKEN;
  const FB_PAGE_ID = env.FB_PAGE_ID;

  for (const post of posts) {
    if (!FB_TOKEN || !FB_PAGE_ID) {
      console.log('No FB credentials — marking as posted (dev mode)');
      await sbPatch('content_calendar', `id=eq.${post.id}`, { status: 'posted', posted_at: new Date().toISOString() });
      continue;
    }

    const caption = post.caption + (post.hashtags ? '\n\n' + post.hashtags : '');

    try {
      if (post.platform === 'facebook' || post.platform === 'both') {
        const res = await fetch(`https://graph.facebook.com/v18.0/${FB_PAGE_ID}/feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: caption, access_token: FB_TOKEN }),
        });
        const data = await res.json();
        console.log('FB post result:', data);
      }

      await sbPatch('content_calendar', `id=eq.${post.id}`, {
        status: 'posted', posted_at: new Date().toISOString()
      });

      await sbInsert('activity_log', {
        id: 'log-' + Date.now().toString(36),
        user_name: 'system',
        action: 'posted',
        entity: 'social_post',
        entity_id: post.id,
        detail: `Auto-posted to ${post.platform}: ${(post.caption || '').slice(0, 60)}...`,
      });

    } catch(e) {
      console.error('Post failed:', e);
    }
  }
}

// ── CRON: Scheduled publish + social posting ──────────────────────────────────
async function runDailyCron(env) {
  const today = new Date().toISOString().split('T')[0];
  console.log('Daily cron running for', today);

  // 1. Auto-publish scheduled events
  await sbPatch('events', `publish_at=lte.${today}&published=eq.false`, { published: true });

  // 2. Auto-publish scheduled announcements
  await sbPatch('announcements', `publish_at=lte.${today}&published=eq.false`, { published: true });

  // 3. Post today's approved social content
  await postTodaysContent(env);

  // 4. Log
  await sbInsert('activity_log', {
    id: 'cron-' + Date.now().toString(36),
    user_name: 'system', action: 'auto-published', entity: 'scheduled',
    detail: `Daily cron ran for ${today}`,
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    // ── SOCIAL IMAGE ──────────────────────────────────────────────────────────
    if (url.pathname === '/api/social-image' && request.method === 'POST') {
      try {
        const body = await request.json();
        const svg = body.type === 'content'
          ? generateContentSVG(body.category, body.headline, body.body)
          : generateEventSVG(body.title, body.date, body.location, body.color);
        return new Response(svg, { status: 200, headers: { 'Content-Type': 'image/svg+xml', ...CORS } });
      } catch(e) { return json({ error: e.message }, 500); }
    }


    // ── STRIPE DONATE ─────────────────────────────────────────────────────────
    if (url.pathname === '/api/stripe-donate' && request.method === 'POST') {
      try {
        const { amount, fund, name, email, donationId } = await request.json();
        const stripeKey = env.STRIPE_SECRET_KEY;

        if (!stripeKey) return json({ error: 'Stripe not configured' }, 503);

        const fundNames = { general:'General Community Fund', 'one-world-day':'One World Day 2026', 'saturday-school':'Lithuanian Saturday School', 'cultural-garden':'Cultural Garden Maintenance' };
        const fundName  = fundNames[fund] || 'CLAC Donation';
        const siteUrl   = env.SITE_URL || 'https://clac-website.pages.dev';

        const params = new URLSearchParams({
          'payment_method_types[]':        'card',
          'line_items[0][price_data][currency]':                    'usd',
          'line_items[0][price_data][product_data][name]':          `CLAC Donation — ${fundName}`,
          'line_items[0][price_data][product_data][description]':   'Tax-deductible donation to Cleveland Lithuanian American Community, 501(c)(3)',
          'line_items[0][price_data][unit_amount]':                 String(amount * 100),
          'line_items[0][quantity]':                                '1',
          'mode':                          'payment',
          'success_url':                   `${siteUrl}/donate.html?success=true&fund=${fund}&session_id={CHECKOUT_SESSION_ID}`,
          'cancel_url':                    `${siteUrl}/donate.html`,
          'customer_email':                email || '',
          'metadata[donation_id]':         donationId,
          'metadata[fund]':                fund,
          'metadata[donor_name]':          name || '',
          'payment_intent_data[metadata][donation_id]': donationId,
          'payment_intent_data[description]':           `CLAC Donation — ${fundName}`,
        });

        const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeKey}`,
            'Content-Type':  'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        const session = await res.json();
        if (!res.ok) return json({ error: session.error?.message || 'Stripe error' }, 500);

        return json({ url: session.url });
      } catch(e) {
        return json({ error: e.message }, 500);
      }
    }

    // ── CONTACT ───────────────────────────────────────────────────────────────
    if (url.pathname === '/api/contact' && request.method === 'POST') {
      try {
        const { name, email, subject, message } = await request.json();
        if (!name || !email || !message) return json({ error: 'Missing fields' }, 400);
        const toEmail = env.CONTACT_TO_EMAIL || 'astankus28@gmail.com';
        const apiKey  = env.RESEND_API_KEY;
        if (!apiKey) return json({ ok: true });
        const body = `New message from clacleveland.org\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`;
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: 'CLAC Website <onboarding@resend.dev>', to: [toEmail], reply_to: email, subject: `[CLAC] ${subject} — from ${name}`, text: body }),
        });
        if (!res.ok) return json({ error: 'Email failed' }, 500);
        return json({ ok: true });
      } catch(e) { return json({ error: 'Server error' }, 500); }
    }

    // ── COMMUNITY EVENTS ──────────────────────────────────────────────────────
    if (url.pathname.startsWith('/api/community-events')) {
      const today  = new Date().toISOString().split('T')[0];
      const params = new URLSearchParams({ per_page: url.searchParams.get('per_page') || '30', start_date: url.searchParams.get('start_date') || today, status: 'publish' });
      try {
        const upstream = await fetch(`${LTCLE_API}?${params}`, { headers: { 'User-Agent': 'CLAC-CommunityFeed/1.0', 'Accept': 'application/json' }, cf: { cacheTtl: 1800, cacheEverything: true } });
        if (!upstream.ok) return json({ error: `ltcle.org HTTP ${upstream.status}` }, upstream.status);
        const data = await upstream.json();
        return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=1800', ...CORS } });
      } catch(err) { return json({ error: 'Upstream fetch failed' }, 502); }
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runDailyCron(env));
  },
};
