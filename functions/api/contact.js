/**
 * CLAC Contact Form Worker
 * Cloudflare Pages Function: /api/contact
 * Place at: functions/api/contact.js
 *
 * Uses Resend (resend.com) to send contact form emails.
 * Add RESEND_API_KEY as an environment variable in Cloudflare Pages settings.
 * Add CONTACT_TO_EMAIL as an environment variable (your email).
 */

export async function onRequestPost({ request, env }) {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const { name, email, subject, message } = await request.json();

    // Basic validation
    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: CORS });
    }

    const toEmail = env.CONTACT_TO_EMAIL || 'info@clacleveland.org';
    const apiKey  = env.RESEND_API_KEY;

    if (!apiKey) {
      // No API key yet — log and return success anyway so form works during setup
      console.warn('RESEND_API_KEY not set — email not sent');
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: CORS });
    }

    const emailBody = `
New contact form submission from clacleveland.org

Name:    ${name}
Email:   ${email}
Subject: ${subject}
Message:
${message}

---
Reply directly to this email to respond to ${name}.
    `.trim();

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:     'CLAC Website <onboarding@resend.dev>',
        to:       [toEmail],
        reply_to: email,
        subject:  `[CLAC Contact] ${subject} — from ${name}`,
        text:     emailBody,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend error:', err);
      return new Response(JSON.stringify({ error: 'Email failed' }), { status: 500, headers: CORS });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: CORS });

  } catch (e) {
    console.error('Contact worker error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: CORS });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
