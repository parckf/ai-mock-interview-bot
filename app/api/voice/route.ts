import { NextResponse } from 'next/server';
export async function POST(req: Request) {
  try {
    const { text } = await req.json() as { text: string };
    if (!text?.trim() || text.length > 1200) return NextResponse.json({ error: 'Voice text must be between 1 and 1,200 characters.' }, { status: 400 });
    if (!process.env.MURF_API_KEY) return NextResponse.json({ error: 'Murf voice is not configured.' }, { status: 503 });
    const response = await fetch('https://api.murf.ai/v1/speech/generate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'api-key': process.env.MURF_API_KEY }, body: JSON.stringify({ text, voiceId: 'en-US-natalie', format: 'MP3', sampleRate: 44100 }) });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: 'Murf could not generate audio.' }, { status: response.status });
    return NextResponse.json({ audioUrl: data.audioFile || data.audioUrl || null });
  } catch { return NextResponse.json({ error: 'Could not generate voice audio.' }, { status: 500 }); }
}
