import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import streamRouter from './routes/stream';
import libraryRouter from './routes/library';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'jms_super_secret_key_2026';

// ============================================================
// Trust the first proxy hop (Render, Railway, Fly, etc.)
// Required so express-rate-limit can read the real client IP
// from X-Forwarded-For instead of rejecting every request.
// ============================================================
app.set('trust proxy', 1);

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://jms-ten-theta.vercel.app',   // no trailing slash
    /\.vercel\.app$/,                      // preview deploys
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ============================================================
// Pre-authorized accounts (invited users only)
// ============================================================
const ALLOWED_USERS: { [key: string]: string } = {
  jahry8: process.env.AUTH_PASS_JAHRY8 || '',

  domiii: process.env.AUTH_PASS_DOMIII || '',
  natalia: process.env.AUTH_PASS_NATALIA || '',
  becks: process.env.AUTH_PASS_BECKS || '',
  kav: process.env.AUTH_PASS_KAV || '',
  brianna: process.env.AUTH_PASS_BRIANNA || '',
  mom: process.env.AUTH_PASS_MOM || '',
  ari: process.env.AUTH_PASS_ARI || '',
  ellie: process.env.AUTH_PASS_ELLIE || '',

  user1: process.env.AUTH_PASS_USER1 || '',
  user2: process.env.AUTH_PASS_USER2 || '',
  user3: process.env.AUTH_PASS_USER3 || '',
  user4: process.env.AUTH_PASS_USER4 || '',
  user5: process.env.AUTH_PASS_USER5 || '',
  user6: process.env.AUTH_PASS_USER6 || '',
  user7: process.env.AUTH_PASS_USER7 || '',
  user8: process.env.AUTH_PASS_USER8 || '',
  user9: process.env.AUTH_PASS_USER9 || '',
  user10: process.env.AUTH_PASS_USER10 || '',
};

// Only these users get the 'admin' role
const ADMIN_USERS = new Set(['jahry8']);

export const authenticateToken = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
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

// ============================================================
// Auth Routes
// ============================================================
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/auth/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const normalizedUser = String(username).toLowerCase().trim();
  const validPassword = ALLOWED_USERS[normalizedUser];

  if (!validPassword || validPassword.length === 0) {
    return res.status(401).json({ error: 'Invalid credentials or unauthorized user.' });
  }

  const matches =
    validPassword.length === password.length &&
    [...validPassword].every((c, i) => c === password[i]);

  if (!matches) {
    return res.status(401).json({ error: 'Invalid credentials or unauthorized user.' });
  }

  const role = ADMIN_USERS.has(normalizedUser) ? 'admin' : 'user';

  const token = jwt.sign(
    { username: normalizedUser, role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    token,
    user: { username: normalizedUser, role },
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: (req as any).user });
});

// ============================================================
// Protected API Routes
// ============================================================
app.use('/api/stream', authenticateToken, streamRouter);
app.use('/api/library', authenticateToken, libraryRouter);

// ============================================================
// Health Check
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'JMS Backend Online (Cloudflare R2)',
  });
});

app.listen(PORT, () => {
  console.log(`🎵 JMS Backend server running on http://localhost:${PORT}\n`);
});