import { json } from './_shared';
// Untrusted code must never execute in a Vercel Function.
export function POST() {
  return json({ error: 'Server-side code execution is disabled for security. Use the local JavaScript sandbox.' }, 501);
}
