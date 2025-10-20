// server.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");
const { z } = require("zod");
require("dotenv").config();

const app = express();
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(cors({ origin: (process.env.ALLOWED_ORIGIN || "*").split(",") }));
app.use(rateLimit({ windowMs: 60_000, max: 60 }));

// Uploads kept in memory
const upload = multer({ storage: multer.memoryStorage() });
const clamp = (s, max = 20000) => (s && s.length > max ? s.slice(0, max) : s);

// Health check
app.get("/health", (_req, res) => res.json({ ok: true }));

// 🧠 AI Rewrite Endpoint
const rewriteSchema = z.object({
  sentence: z.string().min(1).max(1500),
  keepTerms: z.array(z.string()).optional().default([]),
});

app.post("/ai/rewrite", async (req, res) => {
  try {
    const { sentence, keepTerms } = rewriteSchema.parse(req.body);

    const systemPrompt = `You are an Easy Read editor. Rewrite the user's text in Easy Read style:
- Short sentences (<= 15 words)
- Simple, common words
- Keep these terms exactly: ${keepTerms.join(", ")}
- If a hard word remains, define it once in brackets.
Return only the rewritten text.`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: sentence },
        ],
        temperature: 0.3,
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      return res.status(502).json({ error: `AI service failed (${r.status})`, detail });
    }

    const data = await r.json();
    const easy = data?.choices?.[0]?.message?.content?.trim() || "";
    res.json({ easyRead: easy });
  } catch (e) {
    console.error("AI rewrite error:", e);
    res.status(400).json({ error: e.message || "Bad request" });
  }
});

// 💬 AI Jargon Reduction Endpoint
const jargonSchema = z.object({
  text: z.string().min(1).max(2000),
  keepTerms: z.array(z.string()).optional().default([]),
});

app.post("/ai/jargon-reduction", async (req, res) => {
  try {
    const { text, keepTerms } = jargonSchema.parse(req.body);
    const systemPrompt = `You are a language simplifier that reduces jargon and explains complex or technical words.
Simplify the user's text while keeping the original meaning and tone.
Guidelines:
- Replace jargon or technical terms with simpler alternatives.
- If a technical term must stay, briefly explain it in brackets.
- Keep these terms exactly: ${keepTerms.join(", ")}.
Return only the simplified text.`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        temperature: 0.4,
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      return res.status(502).json({ error: `AI service failed (${r.status})`, detail });
    }

    const data = await r.json();
    const simplified = data?.choices?.[0]?.message?.content?.trim() || "";
    res.json({ simplifiedText: simplified });
  } catch (e) {
    console.error("Jargon reduction error:", e);
    res.status(400).json({ error: e.message || "Bad request" });
  }
});

// 📄 PDF → Text
app.post("/upload/pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const data = await pdfParse(req.file.buffer);
    const text = (data.text || "").trim();
    res.json({ text: clamp(text) });
  } catch {
    res.status(500).json({ error: "Failed to parse PDF" });
  }
});

// 🖼️ Image OCR → Text
app.post("/upload/image", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const result = await Tesseract.recognize(req.file.buffer, "eng");
    const text = (result?.data?.text || "").trim();
    res.json({ text: clamp(text) });
  } catch {
    res.status(500).json({ error: "Failed to OCR image" });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API up on :${port}`));