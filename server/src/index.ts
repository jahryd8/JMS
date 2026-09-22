import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import streamRouter from './routes/stream';
import libraryRouter from './routes/library';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MUSIC_DIR = process.env.MUSIC_DIR || '/run/media/jahry8/JAH LINUX STORE/JaHMuSiC';
const JWT_SECRET = process.env.JWT_SECRET || 'jms_super_secret_key_2026';

app.use(cors({
  origin: '*', // Adjust or specify front-end origin in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Check External Storage Directory
if (!fs.existsSync(MUSIC_DIR)) {
  console.warn(`\n⚠️  [WARNING] Music directory not found or unmounted at: ${MUSIC_DIR}`);
} else {
  console.log(`\n📂 [STORAGE] Connected to music directory: ${MUSIC_DIR}`);
}

// Pre-authorized accounts (Users invited to private server)
const ALLOWED_USERS: Record<string, string> = {
  jahry8: process.env.AUTH_PASS_JAHRY8 || 'admin123',
  family: process.env.AUTH_PASS_FAMILY || 'family123',
  friends: process.env.AUTH_PASS_FRIENDS || 'friends123'
};

// Authentication Middleware
export const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // Allow streaming query tokens for HTML5 <audio> tag src requests
  const queryToken = req.query.token as string;
  const activeToken = token || queryToken;

  if (!activeToken) {
    return res.status(401).json({ error: 'Access denied. No authentication token provided.' });
  }

  jwt.verify(activeToken, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    (req as any).user = user;
    next();
  });
};

// Auth Routes
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const normalizedUser = username.toLowerCase();
  const validPassword = ALLOWED_USERS[normalizedUser];

  if (!validPassword || validPassword !== password) {
    return res.status(401).json({ error: 'Invalid credentials or unauthorized user.' });
  }

  const token = jwt.sign(
    { username: normalizedUser, role: normalizedUser === 'jahry8' ? 'admin' : 'user' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    token,
    user: {
      username: normalizedUser,
      role: normalizedUser === 'jahry8' ? 'admin' : 'user'
    }
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: (req as any).user });
});

// Protected API Routes
app.use('/api/stream', authenticateToken, streamRouter);
app.use('/api/library', authenticateToken, libraryRouter);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    server: 'JMS Backend Online',
    storageMounted: fs.existsSync(MUSIC_DIR) 
  });
});

app.listen(PORT, () => {
  console.log(`🎵 JMS Backend server running on http://localhost:${PORT}\n`);
});