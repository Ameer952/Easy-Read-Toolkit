// server.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");
const { z } = require("zod");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require("dotenv").config();

const app = express();
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(cors({
  origin: ['http://localhost:8081', 'http://localhost:19006'], 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(rateLimit({ windowMs: 60_000, max: 60 }));

const DB_PATH = path.join(__dirname, 'users.db');
const db = new Database(DB_PATH);

const JWT_SECRET = process.env.JWT_SECRET_KEY || crypto.randomBytes(32).toString('hex');
const TOKEN_EXPIRY = '7d';

// Create the users table if it doesn’t exist
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`).run();
console.log('✅ SQLite ready: users table created');

//helper functions
const hashPassword = async (password) => await bcrypt.hash(password, 10);
const verifyPassword = async (password, hash) => await bcrypt.compare(password, hash);
const createToken = (userId, email) => jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

const removePassword = (user) => {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

//auth middleware
const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
    const payload = verifyToken(token);
    const user = getUserById(payload.userId);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const getUserById = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id);
const getUserByEmail = (email) => db.prepare('SELECT * FROM users WHERE email = ?').get(email);
const updateUser = (user) => db.prepare('UPDATE users SET name = ?, email = ?, updatedAt = ? WHERE id = ?').run(user.name, user.email, user.updatedAt, user.id);
const deleteUser = (id) => db.prepare('DELETE FROM users WHERE id = ?').run(id);
const generateUserId = () => `user_${Date.now()}`;

// Uploads kept in memory
const upload = multer({ storage: multer.memoryStorage() });
const clamp = (s, max = 20000) => (s && s.length > max ? s.slice(0, max) : s);

// Health check
app.get("/health", (_req, res) => res.json({ ok: true }));

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


//routes
app.get('/', (_req, res) => res.json({ success: true, message: 'Easy Read Toolkit Profile API is running' }));

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = getUserByEmail(normalizedEmail);

  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Email already registered' });
  }

  const user = {
    id: generateUserId(),
    name: name.trim(),
    email: normalizedEmail,
    password: await hashPassword(password),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.prepare(
    'INSERT INTO users (id, name, email, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(user.id, user.name, user.email, user.password, user.createdAt, user.updatedAt);

  const token = createToken(user.id, user.email);
  return res.status(201).json({
    success: true,
    message: 'User registered successfully',
    user: removePassword(user),
    token,
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = getUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.password))) return res.status(401).json({ success: false, message: 'Invalid credentials' });
  const token = createToken(user.id, user.email);
  res.json({ success: true, message: 'Login successful', user: removePassword(user), token });
});

app.post('/api/auth/logout', authenticate, (_req, res) => {
  res.json({ success: true, message: 'Logout successful' });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json(removePassword(req.user));
});

app.put('/api/auth/profile', authenticate, (req, res) => {
  const { name, email } = req.body;
  const user = req.user;
  if (email && email !== user.email && getUserByEmail(email)) {
    return res.status(400).json({ success: false, message: 'Email already in use' });
  }
  user.name = name || user.name;
  user.email = email || user.email;
  user.updatedAt = new Date().toISOString();
  updateUser(user);
  res.json(removePassword(user));
});

app.delete('/api/auth/profile', authenticate, (req, res) => {
  deleteUser(req.user.id);
  res.json({ success: true, message: 'Account deleted successfully' });
});

app.get('/api/users/stats', authenticate, (_req, res) => {
  res.json({
    success: true,
    stats: {
      documentsRead: 0,
      totalReadingTime: 0,
      favorites: 0,
      lastActive: new Date().toISOString()
    }
  });
});

app.get('/api/admin/export', (_req, res) => {
  const users = db.prepare('SELECT id, name, email, createdAt, updatedAt FROM users').all();
  res.json({ success: true, count: users.length, users });
});

const port = process.env.PORT || 5000;
app.listen(port, "0.0.0.0", () => {
  console.log('='.repeat(60));
  console.log('Easy Read Toolkit API is running');
  console.log('='.repeat(60));
  console.log(`📡 Server: http://localhost:${port}`);
  console.log(`🗃️ Users DB: ${DB_PATH}`);
  console.log('='.repeat(60));
});
