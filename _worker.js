/**
 * CLAC Worker
 * Handles:
 *   /api/community-events  — proxies ltcle.org events calendar
 *   /api/contact           — contact form email via Resend
 */

const LTCLE_API = 'https://ltcle.org/wp-json/tribe/events/v1/events';

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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── CORS PREFLIGHT ──────────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ── CONTACT FORM ────────────────────────────────────────────────────────
    if (url.pathname === '/api/contact' && request.method === 'POST') {
      try {
        const { name, email, subject, message } = await request.json();

        if (!name || !email || !message) {
          return json({ error: 'Missing fields' }, 400);
        }

        const toEmail = env.CONTACT_TO_EMAIL || 'astankus28@gmail.com';
        const apiKey  = env.RESEND_API_KEY;

        if (!apiKey) {
          // No key yet — succeed silently so form works during setup
          console.warn('RESEND_API_KEY not set');
          return json({ ok: true });
        }

        const body = `New message from clacleveland.org\n\nName:    ${name}\nEmail:   ${email}\nSubject: ${subject}\n\nMessage:\n${message}\n\n---\nReply to this email to respond to ${name}.`;

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({
            from:     'CLAC Website <onboarding@resend.dev>',
            to:       [toEmail],
            reply_to: email,
            subject:  `[CLAC] ${subject} — from ${name}`,
            text:     body,
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          console.error('Resend error:', err);
          return json({ error: 'Email failed' }, 500);
        }

        return json({ ok: true });

      } catch (e) {
        console.error('Contact error:', e);
        return json({ error: 'Server error' }, 500);
      }
    }

    // ── COMMUNITY EVENTS ────────────────────────────────────────────────────
    if (url.pathname.startsWith('/api/community-events')) {
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
          cf: { cacheTtl: 1800, cacheEverything: true },
        });

        if (!upstream.ok) {
          return json({ error: `ltcle.org returned HTTP ${upstream.status}` }, upstream.status);
        }

        const data = await upstream.json();
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: {
            'Content-Type':  'application/json',
            'Cache-Control': 'public, max-age=1800',
            ...CORS,
          },
        });

      } catch (err) {
        return json({ error: 'Upstream fetch failed', detail: err.message }, 502);
      }
    }

    // ── EVERYTHING ELSE → STATIC ASSETS ────────────────────────────────────
    return env.ASSETS.fetch(request);
  },
};
