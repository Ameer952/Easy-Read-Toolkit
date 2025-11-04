const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");
const { z } = require("zod");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
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

/* =========================================================
   SQLite-backed AUTH (ported from profilebackend.ts)
   ========================================================= */

// --- CONFIG / DB (from teammate) ---
const PORT = Number(process.env.PORT) || 5000; // :contentReference[oaicite:0]{index=0}
const JWT_SECRET =
   process.env.JWT_SECRET_KEY || crypto.randomBytes(32).toString("hex"); // :contentReference[oaicite:1]{index=1}
const TOKEN_EXPIRY = "7d"; // :contentReference[oaicite:2]{index=2}
const DB_PATH = path.join(__dirname, "users.db"); // :contentReference[oaicite:3]{index=3}

const db = new Database(DB_PATH);
db.prepare(
   `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`
).run();
console.log("✅ SQLite database ready: users table created if missing.");

// --- TYPES (informal here, just documenting teammate’s shape) ---
/*
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
  updatedAt: string;
}
*/

// --- HELPERS (ported) ---
const hashPassword = async (password) => await bcrypt.hash(password, 10); // :contentReference[oaicite:4]{index=4}
const verifyPassword = async (password, hash) =>
   await bcrypt.compare(password, hash); // :contentReference[oaicite:5]{index=5}
const createToken = (userId, email) =>
   jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY }); // :contentReference[oaicite:6]{index=6}
const verifyToken = (token) => jwt.verify(token, JWT_SECRET); // :contentReference[oaicite:7]{index=7}
const removePassword = (user) => {
   const { password, ...userWithoutPassword } = user; // :contentReference[oaicite:8]{index=8}
   return userWithoutPassword;
};
const getUserById = (id) =>
   db.prepare("SELECT * FROM users WHERE id = ?").get(id); // :contentReference[oaicite:9]{index=9}
const getUserByEmail = (email) =>
   db.prepare("SELECT * FROM users WHERE email = ?").get(email); // :contentReference[oaicite:10]{index=10}
const updateUser = (user) =>
   db
      .prepare(
         "UPDATE users SET name = ?, email = ?, updatedAt = ? WHERE id = ?"
      )
      .run(user.name, user.email, user.updatedAt, user.id); // :contentReference[oaicite:11]{index=11}
const deleteUser = (id) => db.prepare("DELETE FROM users WHERE id = ?").run(id); // :contentReference[oaicite:12]{index=12}
const generateUserId = () => `user_${Date.now()}`; // :contentReference[oaicite:13]{index=13}

// --- AUTH MIDDLEWARE (ported) ---
const authenticate = (req, res, next) => {
   // :contentReference[oaicite:14]{index=14}
   try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token)
         return res
            .status(401)
            .json({ success: false, message: "No token provided" });
      const payload = verifyToken(token);
      const user = getUserById(payload.userId);
      if (!user)
         return res
            .status(401)
            .json({ success: false, message: "User not found" });
      req.user = user;
      next();
   } catch (err) {
      res.status(401).json({ success: false, message: "Invalid token" });
   }
};

// --- ROUTES (ported) ---
app.get("/", (_req, res) =>
   res.json({
      success: true,
      message: "Easy Read Toolkit Profile API is running",
   })
); // :contentReference[oaicite:15]{index=15}

// POST /api/auth/register
app.post("/api/auth/register", async (req, res) => {
   // :contentReference[oaicite:16]{index=16}
   const { name, email, password } = req.body;
   if (!name || !email || !password)
      return res
         .status(400)
         .json({ success: false, message: "All fields are required" });

   if (getUserByEmail(email))
      return res
         .status(400)
         .json({ success: false, message: "Email already registered" });

   const user = {
      id: generateUserId(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: await hashPassword(password),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
   }; // :contentReference[oaicite:17]{index=17}

   db.prepare(
      "INSERT INTO users (id, name, email, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
   ).run(
      user.id,
      user.name,
      user.email,
      user.password,
      user.createdAt,
      user.updatedAt
   ); // :contentReference[oaicite:18]{index=18}

   const token = createToken(user.id, user.email); // :contentReference[oaicite:19]{index=19}
   res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: removePassword(user),
      token,
   }); // :contentReference[oaicite:20]{index=20}
});

// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
   // :contentReference[oaicite:21]{index=21}
   const { email, password } = req.body;
   const user = getUserByEmail(email);
   if (!user || !(await verifyPassword(password, user.password)))
      return res
         .status(401)
         .json({ success: false, message: "Invalid credentials" });

   const token = createToken(user.id, user.email); // :contentReference[oaicite:22]{index=22}
   res.json({
      success: true,
      message: "Login successful",
      user: removePassword(user),
      token,
   }); // :contentReference[oaicite:23]{index=23}
});

// POST /api/auth/logout
app.post("/api/auth/logout", authenticate, (_req, res) =>
   res.json({ success: true, message: "Logout successful" })
); // :contentReference[oaicite:24]{index=24}

// GET /api/auth/me
app.get("/api/auth/me", authenticate, (req, res) =>
   res.json(removePassword(req.user))
); // :contentReference[oaicite:25]{index=25}

// PUT /api/auth/profile
app.put("/api/auth/profile", authenticate, (req, res) => {
   // :contentReference[oaicite:26]{index=26}
   const { name, email } = req.body;
   const user = req.user;

   if (email && email !== user.email && getUserByEmail(email)) {
      return res
         .status(400)
         .json({ success: false, message: "Email already in use" });
   }

   user.name = name || user.name;
   user.email = email || user.email;
   user.updatedAt = new Date().toISOString();
   updateUser(user);
   res.json(removePassword(user));
});

// DELETE /api/auth/profile
app.delete("/api/auth/profile", authenticate, (req, res) => {
   // :contentReference[oaicite:27]{index=27}
   deleteUser(req.user.id);
   res.json({ success: true, message: "Account deleted successfully" });
});

// GET /api/users/stats
app.get("/api/users/stats", authenticate, (_req, res) => {
   // :contentReference[oaicite:28]{index=28}
   res.json({
      success: true,
      stats: {
         documentsRead: 0,
         totalReadingTime: 0,
         favorites: 0,
         lastActive: new Date().toISOString(),
      },
   });
});

// GET /api/admin/export
app.get("/api/admin/export", (_req, res) => {
   // :contentReference[oaicite:29]{index=29}
   const users = db
      .prepare("SELECT id, name, email, createdAt, updatedAt FROM users")
      .all();
   res.json({ success: true, count: users.length, users });
});

/* =========================================================
   Your existing non-auth endpoints
   ========================================================= */

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
         • Euphemisms or ‘polite’ words – such as bathroom for toilet
         • Slang terms
         • Idioms – phrases not easily understood from the words alone
            o “Pull up your socks”
            o “Over the moon”

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

app.listen(PORT, "0.0.0.0", () =>
   console.log(`API running on http://0.0.0.0:${PORT}\nUsers DB: ${DB_PATH}`)
);
