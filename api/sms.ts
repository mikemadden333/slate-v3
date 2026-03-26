/**
 * Slate Watch — SMS Alert API
 * Sends real-time safety alerts via Twilio.
 * Phone numbers are NEVER stored — passed per-request from client sessionStorage.
 * 
 * Required Vercel env vars: TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { to, message } = req.body || {};

  if (!to || !message) {
    return res.status(400).json({ error: 'Missing "to" or "message"' });
  }

  // Validate phone format (E.164)
  const phoneRegex = /^\+1\d{10}$/;
  if (!phoneRegex.test(to)) {
    return res.status(400).json({ error: 'Phone must be E.164 format: +1XXXXXXXXXX' });
  }

  const sid = process.env.TWILIO_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) {
    // Graceful fallback — return success with demo flag so UI can show preview
    return res.status(200).json({
      success: false,
      demo: true,
      message: 'Twilio not configured. SMS preview only.',
      preview: { to, message },
    });
  }

  try {
    // Twilio REST API — no SDK needed
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');

    const body = new URLSearchParams({
      To: to,
      From: from,
      Body: message,
    });

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error('Twilio error:', data);
      return res.status(500).json({ success: false, error: data.message || 'Twilio error' });
    }

    return res.status(200).json({
      success: true,
      sid: data.sid,
      status: data.status,
    });
  } catch (err) {
    console.error('SMS send error:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
}
