import { GoogleGenAI } from '@google/genai';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });

export async function readInput(request: Request): Promise<Record<string, any>> {
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).origin !== new URL(request.url).origin) {
    throw new HttpError(403, 'Cross-origin requests are not permitted.');
  }
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'Use application/json.');
  }
  const text = await request.text();
  if (text.length > 65536) throw new HttpError(413, 'Request is too large.');
  try {
    const input = JSON.parse(text);
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error();
    return input;
  } catch {
    throw new HttpError(400, 'Invalid JSON body.');
  }
}

export function safeTranscript(value: unknown): string {
  if (!Array.isArray(value)) return 'No chat history or speech transcript is available.';
  return value.slice(-150).map((line: any) =>
    '[' + String(line?.time || '').slice(0,24) + '] ' +
    String(line?.sender || '').slice(0,80) + ': ' +
    String(line?.text || '').slice(0,2000)
  ).join('\n') || 'No transcript is available.';
}

export async function generate(prompt: string, structured = false): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new HttpError(503, 'AI is unavailable until the server owner configures GEMINI_API_KEY.');
  }
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const result = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
      contents: prompt.slice(0, 50000),
      ...(structured ? { config: { responseMimeType: 'application/json' } } : {})
    });
    if (!result.text) throw Error('Empty AI response');
    return result.text;
  } catch (error) {
    console.error('Meetly AI request failed');
    throw new HttpError(502, 'AI provider is unavailable. Please try again.');
  }
}

export function handleFailure(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  console.error('Meetly API unexpected error');
  return json({ error: 'Request could not be completed.' }, 500);
}
