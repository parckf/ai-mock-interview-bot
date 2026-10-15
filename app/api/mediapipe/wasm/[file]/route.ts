import { NextResponse } from 'next/server';

const PACKAGE_VERSION = '1.1.1';

export async function GET(_request: Request, { params }: { params: { file: string } }) {
  const { file } = params;
  if (!/^[a-zA-Z0-9_-]+\.(?:js|wasm)$/.test(file)) return NextResponse.json({ error: 'Invalid runtime asset.' }, { status: 404 });
  try {
    const response = await fetch(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${PACKAGE_VERSION}/wasm/${encodeURIComponent(file)}`, { next: { revalidate: 86400 } });
    if (!response.ok || !response.body) return NextResponse.json({ error: 'Face detection runtime is unavailable.' }, { status: 502 });
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': file.endsWith('.wasm') ? 'application/wasm' : 'text/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
      }
    });
  } catch {
    return NextResponse.json({ error: 'Could not load the face detection runtime.' }, { status: 502 });
  }
}

