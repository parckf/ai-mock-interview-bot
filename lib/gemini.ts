const MODEL = 'gemini-3.1-flash-lite';

type GeminiOptions = {
  system: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  schema?: Record<string, unknown>;
};

export async function generateGeminiText({ system, prompt, temperature = 0.4, maxOutputTokens = 512, schema }: GeminiOptions) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError(503, 'GEMINI_API_KEY is not configured. Add it to .env.local or your Vercel environment variables.');

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens,
        ...(schema ? { responseFormat: { text: { mimeType: 'application/json', schema } } } : {})
      }
    })
  });

  const payload = await response.json().catch(() => ({})) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
    error?: { message?: string };
  };
  if (!response.ok) throw new GeminiError(response.status, payload.error?.message || 'Gemini request failed.');
  const text = payload.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
  if (!text) throw new GeminiError(502, 'Gemini returned an empty response.');
  return text;
}

export class GeminiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'GeminiError';
  }
}

