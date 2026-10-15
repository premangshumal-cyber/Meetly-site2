import { generate, handleFailure, json, readInput, safeTranscript } from '../_shared.js';

export async function POST(request: Request) {
  try {
    const body = await readInput(request);
    const message = String(body.message || '').trim().slice(0, 3000);
    if (!message) return json({ error: 'Message is required.' }, 400);
    const prompt = `You are Meetly's assistant. Use only the supplied transcript for meeting-specific facts.
If an answer is not known from the transcript, explain that plainly.
Transcript:\n${safeTranscript(body.transcriptLines)}\nQuestion:\n${message}`;
    return json({ answer: await generate(prompt) });
  } catch (error) { return handleFailure(error); }
}
