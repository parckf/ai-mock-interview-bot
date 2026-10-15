import { NextResponse } from 'next/server';

const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';

export async function GET() {
  try {
    const response = await fetch(MODEL_URL, { next: { revalidate: 86400 } });
    if (!response.ok || !response.body) return NextResponse.json({ error: 'Face detection model is unavailable.' }, { status: 502 });
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
      }
    });
  } catch {
    return NextResponse.json({ error: 'Could not load the face detection model.' }, { status: 502 });
  }
}

