import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('VITE_ANTHROPIC_API_KEY not set in environment');
    return res.status(500).json({ error: 'API key not configured' });
  }

  // req.body is already parsed by Vercel when Content-Type is application/json
  // but add safety check
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

  console.log('Anthropic proxy request — model:', body?.model, 'messages:', body?.messages?.length);

  try {
    console.log('Anthropic request:', JSON.stringify({ model: body.model, messageCount: body.messages?.length, role: body.messages?.[0]?.role }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: body.model || 'claude-sonnet-4-20250514',
        max_tokens: body.max_tokens || 1024,
        messages: body.messages,
        ...(body.system ? { system: body.system } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic error:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Anthropic proxy error:', err);
    return res.status(500).json({ error: 'proxy_failed', detail: String(err) });
  }
}
