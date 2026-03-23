import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * AI Proxy — translates Anthropic-format requests from the frontend
 * into OpenAI-compatible API calls, and translates responses back.
 *
 * This allows all frontend code to remain unchanged while using
 * an OpenAI-compatible provider (gpt-4.1-mini via Manus LLM proxy).
 */

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

  // Support both OPENAI_API_KEY and VITE_ANTHROPIC_API_KEY for backward compat
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.VITE_ANTHROPIC_API_KEY;

  // If we have an Anthropic key, use Anthropic directly (original behavior)
  if (anthropicKey) {
    return handleAnthropic(req, res, anthropicKey);
  }

  // Otherwise use OpenAI-compatible API
  if (!openaiKey) {
    console.error('No API key configured (neither OPENAI_API_KEY nor VITE_ANTHROPIC_API_KEY)');
    return res.status(500).json({ error: 'API key not configured' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

  console.log('OpenAI proxy request — model:', body?.model, 'messages:', body?.messages?.length);

  try {
    // Translate Anthropic-format request to OpenAI format
    const openaiMessages: Array<{ role: string; content: string }> = [];

    // Anthropic uses top-level "system" param; OpenAI uses a system message
    if (body.system) {
      openaiMessages.push({ role: 'system', content: body.system });
    }

    // Add user/assistant messages
    if (body.messages) {
      for (const msg of body.messages) {
        openaiMessages.push({
          role: msg.role,
          content: typeof msg.content === 'string'
            ? msg.content
            : Array.isArray(msg.content)
              ? msg.content.map((c: any) => c.text || '').join('\n')
              : String(msg.content),
        });
      }
    }

    // Use the OpenAI-compatible base URL
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        max_tokens: body.max_tokens || 1024,
        temperature: body.temperature || 0.7,
        messages: openaiMessages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI error:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();

    // Translate OpenAI response back to Anthropic format
    // Frontend expects: { content: [{ text: "..." }] }
    const text = data?.choices?.[0]?.message?.content || '';
    return res.status(200).json({
      content: [{ type: 'text', text }],
      model: data.model,
      usage: data.usage,
    });
  } catch (err) {
    console.error('OpenAI proxy error:', err);
    return res.status(500).json({ error: 'proxy_failed', detail: String(err) });
  }
}

// Original Anthropic handler — used when VITE_ANTHROPIC_API_KEY is set
async function handleAnthropic(req: VercelRequest, res: VercelResponse, apiKey: string) {
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

  console.log('Anthropic proxy request — model:', body?.model, 'messages:', body?.messages?.length);

  try {
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
