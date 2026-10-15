# Meetly — browser-based video meetings

Meetly is a React/Vite video meeting app with WebRTC peer-to-peer calls,
meeting links, text chat, screen sharing, shared notes, a whiteboard, and
classroom/interview tools. It is built from the original Meetly application
uploaded to this repository in `meetly.zip`.

## Requirements

- Node.js 22 or newer, npm
- A recent Chrome, Edge, or Firefox browser
- HTTPS (or localhost) for camera, microphone, and screen sharing
- Internet access to the PeerJS public signaling service and WebRTC connectivity

## Run locally

```bash
npm ci
npm run dev
```

Open http://localhost:3000. Create a meeting in one browser window and use
its share link in another window/device. Grant camera and microphone permissions.

## Build, test, and self-host

```bash
npm run lint
npm run build
npm start
```

The frontend is written to `dist/`; the Node/Express server is written to
`build/server.cjs`, outside the public static assets. `npm start`
serves both the API and frontend from port 3000 (or `PORT`).

GitHub Actions builds the app and smoke-tests `/api/health` and the disabled
server-side compiler endpoint on every push/PR.

## Vercel

Connect this repository to a Vercel project using the **Vite** framework.
Build command: `npm run build`. Output directory: `dist`.

The `api/` directory contains compatible Vercel Functions for health and
optional AI assistance. **Do not attempt to deploy `server.ts` as a persistent
background server on Vercel.** WebRTC signaling uses PeerJS externally.

Optional environment variables:

- `GEMINI_API_KEY`: Set this in Vercel environment settings to enable AI
  meeting summaries, chat, and quizzes. Never expose it in client code.
- `GEMINI_MODEL`: Model override (default: `gemini-3.6-flash`).
- `PORT`: Local/self-hosted server port.

Without a Gemini key, the app's core conferencing features can still work.
AI endpoints explicitly respond with HTTP 503; they never invent sample
summaries or meeting decisions.

## Privacy and limitations

- Meetly uses an external PeerJS signaling service to connect browsers.
  Depending on network conditions, some WebRTC connections may fail without
  an independently configured TURN relay, especially behind restrictive NATs.
- Video calls require the host to keep the meeting open. No durable meeting
  database, user authentication, or enterprise access-control service is
  bundled. Meeting codes are not user identities.
- Peer-to-peer mesh connections are better for small calls than large conferences.
  This is not a replacement for an SFU-based conferencing backend.
- JavaScript interview snippets run in a sandboxed browser worker/iframe.
  Python/C++ compilers are **not** available without an isolated external
  execution service. The API refuses all server-side code execution.
- AI features are **opt-in**. Submitting an AI request sends transcript/chat
  text to the configured model provider. The service does not persist it in
  a separate Meetly database.
- Parts of the classroom/interview UI and diagnostics are local-only and do
  not provide persistent multiuser server-side state.

## Source recovery

The `repair/meetly-site2-operational` branch was created without altering
the original upload. The source was safely extracted using
`.github/workflows/recover-source.yml`. The original ZIP remains available
for reference.
