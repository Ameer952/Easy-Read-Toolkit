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

const upload = multer({ storage: multer.memoryStorage() });
const clamp = (s, max = 20000) => (s && s.length > max ? s.slice(0, max) : s);

app.get("/health", (_req, res) => res.json({ ok: true }));

/* =========================================================
   SQLite-backed AUTH AND DB SETUP
   ========================================================= */

const PORT = Number(process.env.PORT) || 5000;
const JWT_SECRET =
   process.env.JWT_SECRET_KEY || crypto.randomBytes(32).toString("hex");
const TOKEN_EXPIRY = "7d";
const DB_PATH = path.join(__dirname, "users.db");

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

db.prepare(
   `
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL,
    sourceTag TEXT,
    fileName TEXT,
    fileUrl TEXT,
    createdAt TEXT NOT NULL
  )
`
).run();
db.prepare(
   `CREATE INDEX IF NOT EXISTS idx_documents_userId ON documents(userId)`
).run();
db.prepare(
   `CREATE INDEX IF NOT EXISTS idx_documents_createdAt ON documents(createdAt)`
).run();

/* =========================================================
   SETTINGS TABLE (USER-LINKED)
   ========================================================= */

db.prepare(
   `
  CREATE TABLE IF NOT EXISTS settings (
    userId TEXT PRIMARY KEY,
    json TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`
).run();

/* =========================================================
   HELPERS: USERS
   ========================================================= */

const hashPassword = async (password) => await bcrypt.hash(password, 10);
const verifyPassword = async (password, hash) =>
   await bcrypt.compare(password, hash);
const createToken = (userId, email) =>
   jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
const verifyToken = (token) => jwt.verify(token, JWT_SECRET);
const removePassword = (user) => {
   const { password, ...userWithoutPassword } = user;
   return userWithoutPassword;
};
const getUserById = (id) =>
   db.prepare("SELECT * FROM users WHERE id = ?").get(id);
const getUserByEmail = (email) =>
   db.prepare("SELECT * FROM users WHERE email = ?").get(email);
const updateUser = (user) =>
   db
      .prepare(
         "UPDATE users SET name = ?, email = ?, updatedAt = ? WHERE id = ?"
      )
      .run(user.name, user.email, user.updatedAt, user.id);
const deleteUser = (id) => db.prepare("DELETE FROM users WHERE id = ?").run(id);
const generateUserId = () => `user_${Date.now()}`;

/* =========================================================
   HELPERS: DOCUMENTS
   ========================================================= */

const createDocumentId = () => `doc_${crypto.randomBytes(8).toString("hex")}`;

const createDocument = (
   userId,
   { title, content, type, sourceTag, fileName, fileUrl }
) => {
   const id = createDocumentId();
   const createdAt = new Date().toISOString();

   db.prepare(
      `
    INSERT INTO documents (id, userId, title, content, type, sourceTag, fileName, fileUrl, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
   ).run(
      id,
      userId,
      title,
      content,
      type,
      sourceTag || null,
      fileName || null,
      fileUrl || null,
      createdAt
   );

   return {
      id,
      userId,
      title,
      content,
      type,
      sourceTag: sourceTag || null,
      fileName: fileName || null,
      fileUrl: fileUrl || null,
      createdAt,
   };
};

const getDocumentsForUser = (userId) =>
   db
      .prepare(
         `
    SELECT id, title, content, type, sourceTag, fileName, fileUrl, createdAt
    FROM documents
    WHERE userId = ?
    ORDER BY datetime(createdAt) DESC
  `
      )
      .all(userId);

const getDocumentById = (id) =>
   db.prepare("SELECT * FROM documents WHERE id = ?").get(id);

const deleteDocumentForUser = (userId, docId) => {
   const doc = getDocumentById(docId);
   if (!doc || doc.userId !== userId) return false;
   db.prepare("DELETE FROM documents WHERE id = ?").run(docId);
   return true;
};

/* =========================================================
   SETTINGS HELPERS
   ========================================================= */

const getSettingsForUser = (userId) => {
   const row = db
      .prepare("SELECT json FROM settings WHERE userId = ?")
      .get(userId);
   if (!row) return null;
   try {
      return JSON.parse(row.json);
   } catch {
      return null;
   }
};

const upsertSettingsForUser = (userId, jsonObj) => {
   const now = new Date().toISOString();
   const asJson = JSON.stringify(jsonObj || {});
   db.prepare(
      `
    INSERT INTO settings (userId, json, updatedAt)
    VALUES (?, ?, ?)
    ON CONFLICT(userId)
    DO UPDATE SET json=excluded.json, updatedAt=excluded.updatedAt
  `
   ).run(userId, asJson, now);
   return { success: true, updatedAt: now, settings: jsonObj };
};

/* =========================================================
   AUTH MIDDLEWARE
   ========================================================= */

const authenticate = (req, res, next) => {
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

/* =========================================================
   AUTH ROUTES
   ========================================================= */

app.get("/", (_req, res) =>
   res.json({
      success: true,
      message: "Easy Read Toolkit Profile API is running",
   })
);

app.post("/api/auth/register", async (req, res) => {
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
   };

   db.prepare(
      "INSERT INTO users (id, name, email, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
   ).run(
      user.id,
      user.name,
      user.email,
      user.password,
      user.createdAt,
      user.updatedAt
   );

   const token = createToken(user.id, user.email);
   res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: removePassword(user),
      token,
   });
});

app.post("/api/auth/login", async (req, res) => {
   const { email, password } = req.body;
   const user = getUserByEmail(email);
   if (!user || !(await verifyPassword(password, user.password)))
      return res
         .status(401)
         .json({ success: false, message: "Invalid credentials" });

   const token = createToken(user.id, user.email);
   res.json({
      success: true,
      message: "Login successful",
      user: removePassword(user),
      token,
   });
});

app.post("/api/auth/logout", authenticate, (_req, res) =>
   res.json({ success: true, message: "Logout successful" })
);

app.get("/api/auth/me", authenticate, (req, res) =>
   res.json(removePassword(req.user))
);

app.put("/api/auth/profile", authenticate, (req, res) => {
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

app.delete("/api/auth/profile", authenticate, (req, res) => {
   deleteUser(req.user.id);
   res.json({ success: true, message: "Account deleted successfully" });
});

app.get("/api/users/stats", authenticate, (_req, res) => {
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

/* =========================================================
   SETTINGS API (USER-LINKED)
   ========================================================= */

app.get("/api/settings", authenticate, (req, res) => {
   const s = getSettingsForUser(req.user.id);
   res.json({ success: true, settings: s || {} });
});

app.put("/api/settings", authenticate, (req, res) => {
   try {
      const incoming = typeof req.body === "object" && req.body ? req.body : {};
      const out = upsertSettingsForUser(req.user.id, incoming);
      res.json({ success: true, ...out });
   } catch (e) {
      res.status(400).json({
         success: false,
         message: "Invalid settings body",
      });
   }
});

/* =========================================================
   DOCUMENTS API (USER-LINKED)
   ========================================================= */

app.get("/api/my-documents", authenticate, (req, res) => {
   const docs = getDocumentsForUser(req.user.id);
   res.json({ success: true, count: docs.length, documents: docs });
});

const documentSchema = z.object({
   title: z.string().min(1).max(500),
   content: z.string().min(1),
   type: z.string().min(1),
   sourceTag: z.string().optional(),
   fileName: z.string().optional(),
   fileUrl: z.string().optional(), // device-side PDF path
});

app.post("/api/documents", authenticate, (req, res) => {
   try {
      const payload = documentSchema.parse(req.body);
      const doc = createDocument(req.user.id, payload);
      res.status(201).json({ success: true, document: doc });
   } catch (e) {
      res.status(400).json({
         success: false,
         message: e.message || "Invalid payload",
      });
   }
});

app.delete("/api/documents/:id", authenticate, (req, res) => {
   const id = req.params.id;
   const ok = deleteDocumentForUser(req.user.id, id);
   if (!ok) {
      return res
         .status(404)
         .json({ success: false, message: "Document not found" });
   }
   res.json({ success: true });
});

app.get("/api/admin/export", (_req, res) => {
   const users = db
      .prepare("SELECT id, name, email, createdAt, updatedAt FROM users")
      .all();
   res.json({ success: true, count: users.length, users });
});

/* =========================================================
   AI REWRITE ENDPOINT
   ========================================================= */

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
      res.status(400).json({ error: e.message || "Bad request" });
   }
});

/* =========================================================
   FILE UPLOAD ENDPOINTS
   ========================================================= */

app.post(
   "/upload/pdf",
   authenticate,
   upload.single("file"),
   async (req, res) => {
      try {
         if (!req.file)
            return res.status(400).json({ error: "No file uploaded" });

         const data = await pdfParse(req.file.buffer);
         const text = (data.text || "").trim();
         const original = req.file.originalname || "Uploaded PDF";

         const title = original;
         const fileName = original;
         const fileUrl = null; // server-only; device PDFs are saved client-side

         const doc = createDocument(req.user.id, {
            title,
            content: clamp(text),
            type: "pdf",
            sourceTag: "upload",
            fileName,
            fileUrl,
         });

         res.json({ success: true, text: clamp(text), document: doc });
      } catch (e) {
         res.status(500).json({ error: "Failed to parse PDF" });
      }
   }
);

app.post("/upload/image", upload.single("file"), async (req, res) => {
   try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const result = await Tesseract.recognize(req.file.buffer, "eng");
      const text = (result?.data?.text || "").trim();
      res.json({ text: clamp(text) });
   } catch (e) {
      res.status(500).json({ error: "Failed to OCR image" });
   }
});

/* =========================================================
   SERVER START
   ========================================================= */

app.listen(PORT, "0.0.0.0", () =>
   console.log(`API running on http://0.0.0.0:${PORT}\nUsers DB: ${DB_PATH}`)
);
