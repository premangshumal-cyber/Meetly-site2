/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const AI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

// Initialize Gemini SDK with User-Agent header for telemetry
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // API Route: Check system health
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", aiEnabled: !!apiKey });
  });

  // Never execute untrusted code on the application server.
  // JavaScript snippets run in a restricted browser iframe instead.
  app.post('/api/compile', (_req, res) => {
    res.status(501).json({ error: 'Server-side code execution is disabled for security. Run JavaScript in the browser-based sandbox instead.' });
  });

  // API Route: AI Meeting Assistant (Live Summary, Actions, Timeline, Decisions, Tasks, Questions)
  app.post("/api/ai/meeting", async (req, res) => {
    if (!ai) {
      return res.status(503).json({ error: 'AI features are unavailable. Configure GEMINI_API_KEY on the server to enable them.' });
    }

    const { transcriptLines, userPrompt } = req.body;
    const formattedTranscript = Array.isArray(transcriptLines) && transcriptLines.length > 0
      ? transcriptLines.slice(-150).map((l: any) => `[${String(l?.time || "").slice(0, 24)}] ${String(l?.sender || "").slice(0, 80)}: ${String(l?.text || "").slice(0, 2000)}`).join("\n")
      : "No chat history or verbal transcripts logged yet.";

    const prompt = `
    Analyze the following meeting transcript/chat history and provide:
    1. A concise Live Summary (2-3 paragraphs max)
    2. A checklist of Action Items
    3. A list of Key Decisions
    4. Important Questions asked
    5. Specific Tasks detected
    6. A Meeting Timeline with timestamps (e.g. 00:01, 00:15) and highlights.

    Transcript:
    ${formattedTranscript}

    Additional instructions or user query:
    ${userPrompt || "Generate a general summary and structured analysis."}

    Return your output strictly as a JSON object with this schema:
    {
      "summary": "string describing the live summary",
      "actionItems": ["item 1", "item 2"],
      "keyDecisions": ["decision 1", "decision 2"],
      "questions": ["question 1", "question 2"],
      "tasks": ["task 1", "task 2"],
      "timeline": [
        { "timestamp": "MM:SS", "title": "short heading", "description": "short description" }
      ]
    }
    `;

    try {
      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const responseText = response.text;
      if (responseText) {
        res.json(JSON.parse(responseText.trim()));
      } else {
        throw new Error("No response text from Gemini");
      }
    } catch (err: any) {
      console.error("Gemini meeting API error:", err);
      res.status(502).json({ error: "AI service is temporarily unavailable. Please try again." });
    }
  });

  // API Route: AI Ask Chat (Ask questions about meeting)
  app.post("/api/ai/chat", async (req, res) => {
    if (!ai) {
      return res.status(503).json({ error: 'AI chat is unavailable until GEMINI_API_KEY is configured.' });
    }

    const { transcriptLines, message } = req.body;
    const formattedTranscript = Array.isArray(transcriptLines) && transcriptLines.length > 0
      ? transcriptLines.slice(-150).map((l: any) => `[${String(l?.time || "").slice(0, 24)}] ${String(l?.sender || "").slice(0, 80)}: ${String(l?.text || "").slice(0, 2000)}`).join("\n")
      : "No transcript history logged yet.";

    const prompt = `
    You are Meetly's live AI meeting co-pilot. You have access to the full meeting transcript below.
    Answer the user's question accurately using details from the transcript if available. If not mentioned in transcript, answer intelligently based on general professional co-pilot knowledge.

    Meeting transcript:
    ${formattedTranscript}

    User Question:
    "${message}"

    Answer in a professional, clear, and direct style.
    `;

    try {
      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: prompt,
      });

      res.json({ answer: response.text });
    } catch (err: any) {
      console.error("Gemini Chat API error:", err);
      res.status(502).json({ error: "AI service is temporarily unavailable. Please try again." });
    }
  });

  // API Route: AI Generate Quiz
  app.post("/api/ai/quiz", async (req, res) => {
    if (!ai) {
      return res.status(503).json({ error: 'AI quiz generation is unavailable until GEMINI_API_KEY is configured.' });
    }

    const { topic } = req.body;
    const prompt = `
    Create an educational multiple-choice quiz about "${topic || "WebRTC and Modern Meetings"}" containing exactly 3-5 high-quality questions.
    Return your output strictly as a JSON object with this schema:
    {
      "title": "A short engaging quiz title",
      "questions": [
        {
          "question": "The question text",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "answerIndex": 0 // 0-indexed correct option index
        }
      ]
    }
    `;

    try {
      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const responseText = response.text;
      if (responseText) {
        res.json(JSON.parse(responseText.trim()));
      } else {
        throw new Error("No response text from Gemini");
      }
    } catch (err: any) {
      res.status(502).json({ error: "AI quiz generation failed. Please try again." });
    }
  });

  // Vite middleware setup for Development, otherwise serve production build static files
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Meetly Full-Stack] Server running on http://localhost:${PORT}`);
  });
}

startServer();
