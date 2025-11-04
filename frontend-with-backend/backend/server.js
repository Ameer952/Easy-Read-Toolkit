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

// ======== AUTH (DEV-FRIENDLY) ========
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// In-memory store for dev (replace with DB in production)
const users = new Map(); // key: email, value: { id, name, email, hash, createdAt }

const registerSchema = z.object({
   name: z.string().min(1),
   email: z.string().email(),
   password: z.string().min(6),
});

const loginSchema = z.object({
   email: z.string().email(),
   password: z.string().min(6),
});

function signToken(user) {
   const ttl = Number(process.env.TOKEN_TTL_HOURS || 24);
   return jwt.sign(
      { sub: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: `${ttl}h` }
   );
}

function publicUser(u) {
   return { id: u.id, name: u.name, email: u.email, createdAt: u.createdAt };
}

// POST /api/auth/register
app.post("/api/auth/register", async (req, res) => {
   try {
      const { name, email, password } = registerSchema.parse(req.body);
      const key = email.toLowerCase();

      if (users.has(key)) {
         return res
            .status(409)
            .json({ success: false, message: "Email already registered" });
      }

      const hash = await bcrypt.hash(password, 10);
      const user = {
         id: Date.now().toString(),
         name: name.trim(),
         email: key,
         hash,
         createdAt: new Date().toISOString(),
      };
      users.set(key, user);

      const token = signToken(user);
      return res.json({ success: true, user: publicUser(user), token });
   } catch (e) {
      return res
         .status(400)
         .json({ success: false, message: e.message || "Bad request" });
   }
});

// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
   try {
      const { email, password } = loginSchema.parse(req.body);
      const key = email.toLowerCase();
      const user = users.get(key);

      if (!user)
         return res
            .status(401)
            .json({ success: false, message: "Invalid credentials" });

      const ok = await bcrypt.compare(password, user.hash);
      if (!ok)
         return res
            .status(401)
            .json({ success: false, message: "Invalid credentials" });

      const token = signToken(user);
      return res.json({ success: true, user: publicUser(user), token });
   } catch (e) {
      return res
         .status(400)
         .json({ success: false, message: e.message || "Bad request" });
   }
});

// POST /api/auth/logout
app.post("/api/auth/logout", (_req, res) => {
   // With stateless JWTs, logout is client-side token deletion.
   return res.json({ success: true });
});

// Optional: GET /api/auth/me to verify token
app.get("/api/auth/me", (req, res) => {
   const auth = req.headers.authorization || "";
   const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
   if (!token)
      return res.status(401).json({ success: false, message: "Missing token" });

   try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
      // Find user by email
      const user = users.get((decoded.email || "").toLowerCase());
      if (!user)
         return res
            .status(404)
            .json({ success: false, message: "User not found" });
      return res.json({ success: true, user: publicUser(user) });
   } catch (e) {
      return res.status(401).json({ success: false, message: "Invalid token" });
   }
});

// 🧠 AI Rewrite Endpoint
const rewriteSchema = z.object({
   sentence: z.string().min(1).max(15000000),
   keepTerms: z.array(z.string()).optional().default([]),
});

app.post("/ai/rewrite", async (req, res) => {
   try {
      const { sentence, keepTerms } = rewriteSchema.parse(req.body);

      const systemPrompt = `You are an Easy Read editor. Ensure you use the least number of words to get your message across.
      Rewrite the user's text in Easy Read style:
      - a paragraph should have no more than 2 sentences or around 25 words, after every paragraph insert a line break
      - Simple, common words
      - Keep these terms exactly: ${keepTerms.join(", ")}
      - Do not use/Avoid brackets ( ), ampersands &, hyphens –, commas ,
      - Do not use contractions
      - Do not use confusing terms
         •	Euphemisms or ‘polite’ words – such as bathroom for toilet
         •	Slang terms
         •	Idioms – phrases not easily understood from the words alone
            o	“Pull up your socks”
            o	“Over the moon”

      Return only the rewritten text.`;

      const r = await fetch("https://api.openai.com/v1/chat/completions", {
         method: "POST",
         headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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
         return res
            .status(502)
            .json({ error: `AI service failed (${r.status})`, detail });
      }

      const data = await r.json();
      const easy = data?.choices?.[0]?.message?.content?.trim() || "";
      res.json({ easyRead: easy });
   } catch (e) {
      console.error("AI rewrite error:", e);
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
app.listen(port, "0.0.0.0", () =>
   console.log(`API running on http://0.0.0.0:${port}`)
);
