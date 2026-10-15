import { json } from './_shared';
export function GET() {
  return json({ status: 'ok', aiEnabled: Boolean(process.env.GEMINI_API_KEY) });
}
