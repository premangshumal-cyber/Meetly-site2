import { generate, handleFailure, json, readInput, safeTranscript } from '../_shared';

export async function POST(request: Request) {
  try {
    const body = await readInput(request);
    const transcript = safeTranscript(body.transcriptLines);
    const userPrompt = String(body.userPrompt || '').slice(0, 3000);
    const prompt = `Analyze these real meeting notes without inventing events or people.
Return a JSON object with summary (string), actionItems, keyDecisions, questions, tasks (arrays of strings),
and timeline (array of objects with timestamp, title, description).
If there is no evidence, return empty arrays and an honest summary saying no meeting content was provided.
Transcript:\n${transcript}\nAdditional request:\n${userPrompt}`;
    const result = JSON.parse(await generate(prompt, true));
    return json(result);
  } catch (error) { return handleFailure(error); }
}
