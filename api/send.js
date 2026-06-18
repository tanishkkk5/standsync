// api/send.js — Vercel serverless function. Sends email via Resend SERVER-SIDE.
// The browser never talks to Resend directly (that's blocked by CORS and would
// leak the API key). The frontend POSTs here; this function calls Resend.
//
// Required Vercel env var (NOT prefixed with REACT_APP_, so it stays server-only):
//   RESEND_API_KEY = re_xxxxxxxxxxxx
//
// Optional:
//   EMAIL_FROM = StandSync <onboarding@resend.dev>   (default below)

export default async function handler(req, res) {
  // CORS for same-origin app (and preflight)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const KEY = process.env.RESEND_API_KEY;
  if (!KEY) {
    return res.status(500).json({ ok: false, error: 'RESEND_API_KEY not set on the server' });
  }

  try {
    // Body may arrive as string or object depending on runtime
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { to, subject, html, from } = body;

    if (!to || !subject || !html) {
      return res.status(400).json({ ok: false, error: 'Missing to / subject / html' });
    }

    const toArr = Array.isArray(to) ? to : [to];
    const FROM = from || process.env.EMAIL_FROM || 'StandSync <onboarding@resend.dev>';

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to: toArr, subject, html }),
    });

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      console.error('[api/send] Resend error', r.status, data);
      return res.status(r.status).json({ ok: false, error: data?.message || 'Resend error', status: r.status });
    }

    return res.status(200).json({ ok: true, id: data?.id });
  } catch (e) {
    console.error('[api/send] failed', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
