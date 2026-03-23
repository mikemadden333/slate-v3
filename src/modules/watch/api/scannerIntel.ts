import type { ScannerCall } from './scanner';

export interface DispatchIncident {
  id: string;
  date: string;
  type: string;
  block: string;
  lat: number;
  lng: number;
  description: string;
  source: 'DISPATCH';
  transcript: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  audioUrl: string;
}

export async function transcribeSpikeCalls(calls: ScannerCall[]): Promise<DispatchIncident[]> {
  const withAudio = calls.filter(c => c.url && c.url.startsWith('http'));
  if (withAudio.length === 0) { console.log('Scanner intel: no audio URLs'); return []; }
  const toProcess = withAudio; // ALL calls with audio — every call is intelligence
  console.log('Scanner intel: transcribing ' + toProcess.length + ' calls (overnight sweep)');
  const transcripts: Array<{ call: ScannerCall; text: string }> = [];
  for (const call of toProcess) {
    try {
      const res = await fetch('/api/transcribe-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: call.url }),
      });
      const data = await res.json() as { transcript: string; error?: string };
      if (data.transcript && data.transcript.length > 5) {
        transcripts.push({ call, text: data.transcript });
        console.log('Scanner intel [' + call.zoneName + ']: ' + data.transcript);
      }
    } catch (err) { console.log('Scanner intel transcription failed:', String(err)); }
  }
  if (transcripts.length === 0) return [];
  const lines = transcripts.map((t, i) => i + ': [Zone ' + (t.call.zone ?? '?') + ', ' + t.call.time + '] "' + t.text + '"').join('\n');
  const prompt = 'You are a Chicago police dispatch interpreter for a school safety system.\n\nExtract location and incident type from these CPD radio transcripts.\nReturn ONLY a JSON array. No preamble, no markdown.\n\nTranscripts:\n' + lines + '\n\nFor each return: {"id":<index>,"lat":<decimal or 0>,"lng":<decimal or 0>,"type":<SHOOTING|BATTERY|ROBBERY|TRAFFIC|OTHER>,"block":<address or "">,"confidence":<HIGH|MEDIUM|LOW>}\n\nChicago: lat 41.6-42.1, lng -87.95 to -87.5. Return 0,0 if location unknown.\n\nReturn ALL incidents with a extractable Chicago location, including SHOOTING, BATTERY, ROBBERY, DOMESTIC, PERSON WITH GUN, ASSAULT. Ignore pure administrative calls with no location.';
  try {
    const res = await fetch('/api/anthropic-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) return [];
    const data = await res.json() as { content: Array<{ text: string }> };
    const raw = (data.content?.[0]?.text ?? '').trim().replace(/\`\`\`json|\`\`\`/g, '').trim();
    const parsed = JSON.parse(raw) as Array<{ id: number; lat: number; lng: number; type: string; block: string; confidence: string }>;
    const incidents: DispatchIncident[] = [];
    for (const p of parsed) {
      if (p.lat === 0 || p.lng === 0) continue;
      if (p.lat < 41.6 || p.lat > 42.1) continue;
      if (p.lng < -87.95 || p.lng > -87.5) continue;
      const t = transcripts[p.id];
      if (!t) continue;
      if (!['SHOOTING','BATTERY','ROBBERY','ASSAULT','DOMESTIC','PERSON WITH GUN','WEAPONS'].includes(p.type)) continue;
      incidents.push({ id: 'dispatch-' + t.call.id, date: t.call.time, type: p.type, block: p.block, lat: p.lat, lng: p.lng, description: t.text, source: 'DISPATCH', transcript: t.text, confidence: p.confidence as 'HIGH' | 'MEDIUM' | 'LOW', audioUrl: t.call.url });
    }
    console.log('Scanner intel: ' + incidents.length + ' geolocated dispatch incidents');
    return incidents;
  } catch (err) { console.log('Scanner intel parsing failed:', String(err)); return []; }
}
