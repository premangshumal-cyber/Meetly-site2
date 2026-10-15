import { generate, handleFailure, json, readInput } from '../_shared';

export async function POST(request: Request) {
  try {
    const body = await readInput(request);
    const topic = String(body.topic || 'WebRTC and modern meetings').slice(0, 300);
    const prompt = `Create a real multiple-choice quiz about ${topic}. Return JSON with
title (string) and questions (3-5 entries). Each question has question (string),
options (exactly four strings), and answerIndex (number 0-3). No comments or markdown.`;
    const result = JSON.parse(await generate(prompt, true));
    return json(result);
  } catch (error) { return handleFailure(error); }
}
