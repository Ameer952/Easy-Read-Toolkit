import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Types
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
  updatedAt: string;
}

interface UserResponse {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthRequest extends Request {
  user?: User;
}

// Configuration
const PORT = Number(process.env.PORT) || 8000;
const JWT_SECRET = process.env.JWT_SECRET_KEY || crypto.randomBytes(32).toString('hex');
const TOKEN_EXPIRY = '7d';
const USERS_FILE = path.join(__dirname, 'users.json');

// Initialize Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Helper Functions
const loadUsers = (): Record<string, User> => {
  if (!fs.existsSync(USERS_FILE)) {
    return {};
  }
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading users:', error);
    return {};
  }
};

const saveUsers = (users: Record<string, User>): void => {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error saving users:', error);
    throw new Error('Failed to save user data');
  }
};

const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

const createToken = (userId: string, email: string): string => {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
};

const verifyToken = (token: string): { userId: string; email: string } => {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

const generateUserId = (): string => {
  return `user_${Date.now()}`;
};

const removePassword = (user: User): UserResponse => {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

// Auth Middleware
const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    const users = loadUsers();
    const user = users[payload.userId];
    
    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Routes

// Health check
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Easy Read Toolkit Profile API is running'
  });
});

// Register
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'All fields are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      return;
    }

    const users = loadUsers();

    // Check if email exists
    const emailExists = Object.values(users).some(
      u => u.email.toLowerCase() === email.toLowerCase()
    );

    if (emailExists) {
      res.status(400).json({ success: false, message: 'Email already registered' });
      return;
    }

    // Create user
    const userId = generateUserId();
    const now = new Date().toISOString();

    const newUser: User = {
      id: userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: await hashPassword(password),
      createdAt: now,
      updatedAt: now
    };

    users[userId] = newUser;
    saveUsers(users);

    const token = createToken(userId, newUser.email);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: removePassword(newUser),
      token
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }

    const users = loadUsers();
    const user = Object.values(users).find(
      u => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!user || !(await verifyPassword(password, user.password))) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const token = createToken(user.id, user.email);

    res.json({
      success: true,
      message: 'Login successful',
      user: removePassword(user),
      token
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// Logout
app.post('/api/auth/logout', authenticate, (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Logout successful' });
});

// Get profile
app.get('/api/auth/me', authenticate, (req: AuthRequest, res: Response) => {
  res.json(removePassword(req.user!));
});

// Update profile
app.put('/api/auth/profile', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const { name, email } = req.body;
    const users = loadUsers();
    const userId = req.user!.id;

    // Check if email is being changed and if it's taken
    if (email && email.toLowerCase() !== req.user!.email.toLowerCase()) {
      const emailTaken = Object.values(users).some(
        u => u.id !== userId && u.email.toLowerCase() === email.toLowerCase()
      );

      if (emailTaken) {
        res.status(400).json({ success: false, message: 'Email already in use' });
        return;
      }
    }

    // Update user
    if (name) users[userId].name = name.trim();
    if (email) users[userId].email = email.toLowerCase().trim();
    users[userId].updatedAt = new Date().toISOString();

    saveUsers(users);

    res.json(removePassword(users[userId]));
  } catch (error) {
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

// Delete profile
app.delete('/api/auth/profile', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const users = loadUsers();
    const userId = req.user!.id;

    delete users[userId];
    saveUsers(users);

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
});

// Get stats
app.get('/api/users/stats', authenticate, (req: AuthRequest, res: Response) => {
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

// Export users (for database migration)
app.get('/api/admin/export', (req: Request, res: Response) => {
  try {
    const users = loadUsers();
    const userList = Object.values(users).map(removePassword);

    res.json({
      success: true,
      count: userList.length,
      users: userList
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Export failed' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(60));
  console.log('Easy Read Toolkit - Profile Backend API');
  console.log('='.repeat(60));
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Server also accessible at http://192.168.86.37:${PORT}`);
  console.log(`Users file: ${USERS_FILE}`);
  console.log('='.repeat(60));
});

export default app;

