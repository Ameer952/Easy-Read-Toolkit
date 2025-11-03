// server.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");
const { z } = require("zod");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(cors({ origin: (process.env.ALLOWED_ORIGIN || "*").split(",") }));
app.use(rateLimit({ windowMs: 60_000, max: 60 }));

// Uploads kept in memory
const upload = multer({ storage: multer.memoryStorage() });
const clamp = (s, max = 20000) => (s && s.length > max ? s.slice(0, max) : s);

// Ensure tmp directory exists
const tmpDir = path.join(__dirname, "tmp");
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

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

// 📄 PDF → Text (using Python OCR)
app.post("/upload/pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const tmpPdfPath = path.join(tmpDir, `${Date.now()}.pdf`);
    const tmpOutputPath = path.join(tmpDir, `${Date.now()}.txt`);
    
    fs.writeFileSync(tmpPdfPath, req.file.buffer);

const pythonScript = path.join(__dirname, "backend", "ocr-pdf.py");

const py = spawn("python", [
  pythonScript,  
  "--pdf", tmpPdfPath,
  "--output", tmpOutputPath
]);

    let errorOutput = "";
    py.stderr.on("data", (data) => {
      errorOutput += data.toString();
      console.error("Python stderr:", data.toString());
    });

    py.on("close", (code) => {
      // Clean up temp PDF
      if (fs.existsSync(tmpPdfPath)) {
        fs.unlinkSync(tmpPdfPath);
      }

      if (code !== 0) {
        console.error("OCR failed with code:", code, errorOutput);
        return res.status(500).json({ error: "OCR failed", detail: errorOutput });
      }

      // Read the output file
      if (!fs.existsSync(tmpOutputPath)) {
        return res.status(500).json({ error: "OCR produced no output" });
      }

      const text = fs.readFileSync(tmpOutputPath, "utf8");
      fs.unlinkSync(tmpOutputPath); // Clean up output file
      
      res.json({ text: clamp(text) });
    });
  } catch (err) {
    console.error("PDF upload error:", err);
    res.status(500).json({ error: "Failed to run OCR" });
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

// Start the server
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API up on :${port}`));