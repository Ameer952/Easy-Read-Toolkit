import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const db = new Database(path.join(__dirname, 'users.db'));

// --- CONFIG ---
const PORT = Number(process.env.PORT) || 8000;
const JWT_SECRET = process.env.JWT_SECRET_KEY || crypto.randomBytes(32).toString('hex');
const TOKEN_EXPIRY = '7d';
const DB_PATH = path.join(__dirname, 'users.db');

// --- DATABASE SETUP ---
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
console.log('✅ SQLite database ready: users table created if missing.');


// --- EXPRESS SETUP ---
const app = express();
app.use(cors());
app.use(express.json());

// --- TYPES ---
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthRequest extends Request {
  user?: User;
}

// --- HELPERS ---
const hashPassword = async (password: string): Promise<string> => await bcrypt.hash(password, 10);
const verifyPassword = async (password: string, hash: string) => await bcrypt.compare(password, hash);
const createToken = (userId: string, email: string): string => jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
const verifyToken = (token: string) => jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
const removePassword = (user: User) => {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};
const getUserById = (id: string): User | undefined => {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
};
const getUserByEmail = (email: string): User | undefined => {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
};
const updateUser = (user: User) => db.prepare('UPDATE users SET name = ?, email = ?, updatedAt = ? WHERE id = ?').run(user.name, user.email, user.updatedAt, user.id);
const deleteUser = (id: string) => db.prepare('DELETE FROM users WHERE id = ?').run(id);
const generateUserId = () => `user_${Date.now()}`;

// --- AUTH MIDDLEWARE ---
const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
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

// --- ROUTES ---
app.get('/', (_req, res) => res.json({ success: true, message: 'Easy Read Toolkit Profile API is running' }));

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ success: false, message: 'All fields are required' });
  if (getUserByEmail(email)) return res.status(400).json({ success: false, message: 'Email already registered' });

  const user: User = {
    id: generateUserId(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: await hashPassword(password),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.prepare('INSERT INTO users (id, name, email, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)')
    .run(user.id, user.name, user.email, user.password, user.createdAt, user.updatedAt);

  const token = createToken(user.id, user.email);
  res.status(201).json({ success: true, message: 'User registered successfully', user: removePassword(user), token });
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

app.get('/api/auth/me', authenticate, (req: AuthRequest, res) => {
  res.json(removePassword(req.user!));
});

app.put('/api/auth/profile', authenticate, (req: AuthRequest, res) => {
  const { name, email } = req.body;
  const user = req.user!;
  if (email && email !== user.email && getUserByEmail(email)) {
    return res.status(400).json({ success: false, message: 'Email already in use' });
  }
  user.name = name || user.name;
  user.email = email || user.email;
  user.updatedAt = new Date().toISOString();
  updateUser(user);
  res.json(removePassword(user));
});

app.delete('/api/auth/profile', authenticate, (req: AuthRequest, res) => {
  deleteUser(req.user!.id);
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

// --- START SERVER ---
app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(60));
  console.log('Easy Read Toolkit - Profile Backend API');
  console.log('='.repeat(60));
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Users DB: ${DB_PATH}`);
  console.log('='.repeat(60));
});

export default app;
