import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
  const { url } = req.body as { url: string };
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const audioRes = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!audioRes.ok) return res.status(200).json({ transcript: '', error: 'audio_fetch_failed' });
    const audioBuffer = await audioRes.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mp4' });
    const form = new FormData();
    form.append('file', audioBlob, 'call.m4a');
    form.append('model', 'whisper-1');
    form.append('language', 'en');
    form.append('prompt', 'CPD Chicago police dispatch. Addresses, intersections, district numbers, beat numbers, shots fired, battery, robbery, traffic accident.');
    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(30000),
    });
    if (!whisperRes.ok) {
      const err = await whisperRes.text();
      return res.status(200).json({ transcript: '', error: 'whisper_failed: ' + err.slice(0,100) });
    }
    const data = await whisperRes.json() as { text: string };
    console.log('Whisper transcript:', data.text);
    return res.status(200).json({ transcript: data.text });
  } catch (err) {
    return res.status(200).json({ transcript: '', error: String(err) });
  }
}
